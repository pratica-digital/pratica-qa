import { AiJsonService } from './ai-json.service';

describe('AiJsonService', () => {
  let service: AiJsonService;

  beforeEach(() => {
    service = new AiJsonService();
  });

  it('parses JSON from a fenced markdown response with surrounding text', () => {
    const result = service.parseJson([
      'Claro, segue o JSON:',
      '```json',
      '{"test_cases":[{"titulo":"Validar login","passos":[{"descricao":"Acessar","resultado_esperado":"Tela aberta"}]}]}',
      '```',
    ].join('\n'));

    expect(result).toEqual({
      test_cases: [
        {
          titulo: 'Validar login',
          passos: [{ descricao: 'Acessar', resultado_esperado: 'Tela aberta' }],
        },
      ],
    });
  });

  it('extracts the balanced JSON object when text appears before and after it', () => {
    const result = service.parseJson(
      'Resultado: {"mensagem":"valor com } dentro da string","items":[{"ok":true}]} fim.',
    );

    expect(result).toEqual({
      mensagem: 'valor com } dentro da string',
      items: [{ ok: true }],
    });
  });

  it('accepts trailing commas in otherwise valid JSON', () => {
    const result = service.parseJson('{"test_cases":[{"titulo":"Caso","passos":[],}],}');

    expect(result).toEqual({
      test_cases: [{ titulo: 'Caso', passos: [] }],
    });
  });

  it('normalizes generation responses with alternative case fields', () => {
    const result = service.normalizeGeneration({
      cases: [
        {
          title: 'Generated case',
          passos: [{ descricao: 'Executar validacao' }],
        },
      ],
      regressionSuite: [{ id: 'AI-TC-001', titulo: 'Regressao principal' }],
      coverage: { melhorias: 80 },
    });

    expect(result.test_cases).toHaveLength(1);
    expect(result.test_cases[0].titulo).toBe('Generated case');
    expect(result.regression_suite).toHaveLength(1);
    expect(result.cobertura.melhorias).toBe(80);
  });
});
