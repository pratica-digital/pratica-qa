import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  AiCoverage,
  AiGeneratedStep,
  AiGeneratedTestCase,
  AiRegressionSuiteItem,
  AiTestGenerationResult,
  ReleaseAnalysisResult,
  ReleaseChange,
} from '../domain/ai-test-generator.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item)).filter(Boolean);
}

function getFirstArrayField(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function asPriority(value: unknown): ReleaseChange['prioridade'] {
  const normalized = asString(value, 'media').toLowerCase();

  if (normalized.includes('critic')) {
    return 'critica';
  }

  if (normalized.includes('alt')) {
    return 'alta';
  }

  if (normalized.includes('baix')) {
    return 'baixa';
  }

  return 'media';
}

function asNumberPercent(value: unknown) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeStep(value: unknown, index: number): AiGeneratedStep {
  if (isRecord(value)) {
    return {
      descricao: asString(value.descricao ?? value.description ?? value.passo, `Executar passo ${index + 1}`),
      resultado_esperado: asString(value.resultado_esperado ?? value.expectedResult ?? value.resultado),
    };
  }

  return {
    descricao: asString(value, `Executar passo ${index + 1}`),
    resultado_esperado: '',
  };
}

function normalizeTestCase(value: unknown, index: number): AiGeneratedTestCase {
  const record = isRecord(value) ? value : {};
  const rawSteps = Array.isArray(record.passos) ? record.passos : [];
  const steps = rawSteps.map((step, stepIndex) => normalizeStep(step, stepIndex));

  return {
    id: asString(record.id, `AI-TC-${String(index + 1).padStart(3, '0')}`),
    titulo: asString(record.titulo ?? record.title, `Caso de teste ${index + 1}`),
    descricao: asString(record.descricao ?? record.description),
    pre_condicoes: asString(record.pre_condicoes ?? record.preconditions),
    passos: steps.length > 0 ? steps : [{ descricao: 'Validar a alteracao descrita na release.', resultado_esperado: 'A alteracao se comporta conforme esperado.' }],
    resultado_esperado: asString(record.resultado_esperado ?? record.expectedResult),
    prioridade: asString(record.prioridade, 'Media'),
    severidade: asString(record.severidade, 'Media'),
    categoria: asString(record.categoria, 'Funcional'),
    modulo: asString(record.modulo, 'Nao informado'),
    tipo_teste: asString(record.tipo_teste, 'Funcional'),
    teste_positivo: asString(record.teste_positivo, 'Nao'),
    teste_negativo: asString(record.teste_negativo, 'Nao'),
    regressao: asString(record.regressao, 'Nao'),
    automacao: asString(record.automacao, 'Avaliar'),
    risco: asString(record.risco, 'Medio'),
    dados_teste: asStringArray(record.dados_teste),
    funcionalidades_afetadas: asStringArray(record.funcionalidades_afetadas),
    origem_release: asString(record.origem_release),
    trecho_release: asString(record.trecho_release),
    complexidade: asString(record.complexidade, 'Media'),
    probabilidade_regressao: asString(record.probabilidade_regressao, 'Media'),
  };
}

function parseJsonCandidate(candidate: string): unknown {
  try {
    return JSON.parse(candidate);
  } catch {
    return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
  }
}

@Injectable()
export class AiJsonService {
  parseJson(rawResponse: string): unknown {
    const candidates = this.getJsonCandidates(rawResponse);

    for (const candidate of candidates) {
      try {
        return parseJsonCandidate(candidate);
      } catch {
        continue;
      }
    }

    throw new BadGatewayException(
      'AI returned invalid JSON. The response could not be parsed as valid JSON.',
    );
  }

  normalizeAnalysis(value: unknown): ReleaseAnalysisResult {
    const record = isRecord(value) ? value : {};
    const rawChanges = Array.isArray(record.changes)
      ? record.changes
      : Array.isArray(record.alteracoes)
        ? record.alteracoes
        : [];

    const changes = rawChanges.map((item, index) => this.normalizeChange(item, index));

    if (changes.length === 0) {
      throw new BadGatewayException('AI analysis did not identify release changes.');
    }

    return {
      modulo_principal: asString(record.modulo_principal ?? record.modulo, changes[0]?.modulo ?? 'Nao informado'),
      resumo: asString(record.resumo ?? record.summary),
      changes,
    };
  }

  normalizeGeneration(value: unknown): AiTestGenerationResult {
    const record = isRecord(value) ? value : {};
    const rawCases = Array.isArray(value)
      ? value
      : getFirstArrayField(record, ['test_cases', 'testCases', 'cases', 'casos', 'casos_de_teste']);
    const testCases = rawCases.map((item, index) => normalizeTestCase(item, index));

    if (testCases.length === 0) {
      throw new BadGatewayException('AI generation returned no test cases.');
    }

    const rawRegressionSuite = getFirstArrayField(record, [
      'regression_suite',
      'regressionSuite',
      'suite_regressao',
    ]);

    return {
      test_cases: testCases,
      regression_suite: rawRegressionSuite.map((item, index) => this.normalizeRegressionItem(item, testCases, index)),
      cobertura: this.normalizeCoverage(record.cobertura ?? record.coverage),
    };
  }

  normalizeTestCase(value: unknown): AiGeneratedTestCase {
    return normalizeTestCase(value, 0);
  }

  private normalizeChange(value: unknown, index: number): ReleaseChange {
    const record = isRecord(value) ? value : {};

    return {
      id: asString(record.id, `REL-${String(index + 1).padStart(3, '0')}`),
      modulo: asString(record.modulo, 'Nao informado'),
      tipo: asString(record.tipo, 'Alteracao'),
      descricao: asString(record.descricao, 'Alteracao identificada na release.'),
      categoria: asString(record.categoria, 'Funcional'),
      impacto: asString(record.impacto, 'Nao informado'),
      origem: asString(record.origem ?? record.origem_release, 'Release Notes'),
      trecho_release: asString(record.trecho_release ?? record.trecho, asString(record.descricao)),
      prioridade: asPriority(record.prioridade),
      riscos: asStringArray(record.riscos),
      funcionalidades_afetadas: asStringArray(record.funcionalidades_afetadas),
      dependencias: asStringArray(record.dependencias),
    };
  }

  private normalizeRegressionItem(
    value: unknown,
    testCases: AiGeneratedTestCase[],
    index: number,
  ): AiRegressionSuiteItem {
    const record = isRecord(value) ? value : {};
    const fallbackCase = testCases[index] ?? testCases[0];

    return {
      case_id: asString(record.case_id ?? record.id, fallbackCase?.id ?? ''),
      titulo: asString(record.titulo, fallbackCase?.titulo ?? `Regressao ${index + 1}`),
      risco: asString(record.risco, fallbackCase?.risco ?? 'Medio'),
      justificativa: asString(record.justificativa, 'Teste essencial para estabilidade da versao.'),
    };
  }

  private normalizeCoverage(value: unknown): AiCoverage {
    const record = isRecord(value) ? value : {};

    return {
      novas_funcionalidades: asNumberPercent(record.novas_funcionalidades),
      melhorias: asNumberPercent(record.melhorias),
      correcoes: asNumberPercent(record.correcoes),
      eventos: asNumberPercent(record.eventos),
    };
  }

  private getJsonCandidates(rawResponse: string) {
    const normalized = rawResponse.replace(/^\uFEFF/, '').trim();
    const candidates = new Set<string>();
    this.addCandidate(candidates, normalized);

    const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
    let fenceMatch: RegExpExecArray | null;

    while ((fenceMatch = fenceRegex.exec(normalized)) !== null) {
      this.addCandidate(candidates, fenceMatch[1]);
    }

    for (const candidate of this.extractBalancedJson(normalized)) {
      this.addCandidate(candidates, candidate);
    }

    return [...candidates];
  }

  private addCandidate(candidates: Set<string>, value: string | undefined) {
    const candidate = value?.trim();

    if (candidate) {
      candidates.add(candidate);
    }
  }

  private extractBalancedJson(value: string) {
    const candidates: string[] = [];

    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== '{' && value[index] !== '[') {
        continue;
      }

      const candidate = this.readBalancedJson(value, index);

      if (candidate) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  private readBalancedJson(value: string, startIndex: number) {
    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < value.length; index += 1) {
      const char = value[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = false;
        }

        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        stack.push('}');
        continue;
      }

      if (char === '[') {
        stack.push(']');
        continue;
      }

      if (char === '}' || char === ']') {
        if (stack.pop() !== char) {
          return '';
        }

        if (stack.length === 0) {
          return value.slice(startIndex, index + 1);
        }
      }
    }

    return '';
  }
}
