import { Logger } from '@nestjs/common';
import { TestResultStatus } from '@prisma/client';
import { ShortcutFailureStoryService } from './shortcut-failure-story.service';
import { ShortcutService } from './shortcut.service';

const failedResult = {
  attachments: [{ originalName: 'evidence.png', url: 'https://files/evidence.png' }],
  comment: 'Tela exibiu erro 500.',
  executedAt: new Date('2026-06-29T12:00:00.000Z'),
  executedBy: { name: 'QA User', email: 'qa@example.com' },
  id: 'result-id',
  shortcutStoryId: null,
  status: TestResultStatus.FAILED,
  testCase: {
    description: 'Validar o fluxo principal sem alterar o texto original.',
    expectedResult: 'Operacao concluida.\nMensagem original exibida.',
    position: 31,
    steps: [
      {
        description: 'Executar acao principal',
        expectedResult: 'Acao processada',
        order: 1,
      },
      {
        description: 'Observar o resultado',
        expectedResult: null,
        order: 2,
      },
    ],
    title: 'Validar fluxo principal',
  },
  testRun: {
    name: 'Regression Run',
    project: { name: 'QA Platform' },
    url: 'https://qa.example.test/test-runs/31?tab=results',
  },
};

const expectedDescription = `# Descrição

## Objetivo:
Validar o fluxo principal sem alterar o texto original.

# Passos

1. Executar acao principal
2. Observar o resultado

# Resultado esperado

- Operacao concluida.
- Mensagem original exibida.

# Resultado obtido
Tela exibiu erro 500.

# Outras informações

- Reportado por: QA User

- Número do caso de teste: 31

- Execução de teste: [https://qa.example.test/test-runs/31?tab=results](https://qa.example.test/test-runs/31?tab=results)`;

describe('ShortcutFailureStoryService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates and stores a story for a failed result', async () => {
    const prisma = {
      testResult: {
        findUnique: jest.fn().mockResolvedValue({ shortcutStoryId: null }),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const shortcut = {
      createStory: jest.fn().mockResolvedValue({
        appUrl: 'https://story.url',
        id: '123',
        name: '[BUG] Validar fluxo principal',
      }),
    } as unknown as ShortcutService;
    const service = new ShortcutFailureStoryService(prisma as never, shortcut);

    await service.createForFailedResult(failedResult);

    expect(shortcut.createStory).toHaveBeenCalledWith({
      name: '[BUG] Validar fluxo principal',
      description: expectedDescription,
      storyType: 'bug',
    });
    expect(prisma.testResult.update).toHaveBeenCalledWith({
      where: { id: 'result-id' },
      data: {
        shortcutCreatedAt: expect.any(Date),
        shortcutStoryId: '123',
        shortcutStoryName: '[BUG] Validar fluxo principal',
        shortcutStoryUrl: 'https://story.url',
      },
    });
  });

  it('does not create a duplicate when the result already has a Shortcut story', async () => {
    const prisma = {
      testResult: {
        findUnique: jest.fn().mockResolvedValue({ shortcutStoryId: '123' }),
        update: jest.fn(),
      },
    };
    const shortcut = { createStory: jest.fn() } as unknown as ShortcutService;
    const service = new ShortcutFailureStoryService(prisma as never, shortcut);

    await service.createForFailedResult({ ...failedResult, shortcutStoryId: '123' });

    expect(shortcut.createStory).not.toHaveBeenCalled();
    expect(prisma.testResult.update).not.toHaveBeenCalled();
  });

  it('does not throw when Shortcut creation fails', async () => {
    const prisma = {
      testResult: {
        findUnique: jest.fn().mockResolvedValue({ shortcutStoryId: null }),
        update: jest.fn(),
      },
    };
    const shortcut = {
      createStory: jest.fn().mockRejectedValue(new Error('Shortcut unavailable')),
    } as unknown as ShortcutService;
    const service = new ShortcutFailureStoryService(prisma as never, shortcut);

    await expect(service.createForFailedResult(failedResult)).resolves.toBeUndefined();
    expect(prisma.testResult.update).not.toHaveBeenCalled();
  });

  it('keeps missing values empty without leaking null, undefined, internal ids, or extra fields', () => {
    const service = new ShortcutFailureStoryService({} as never, {} as ShortcutService);
    const description = service.buildDescription({
      attachments: [{ originalName: null, url: 'https://files/should-not-be-in-description' }],
      comment: null,
      executedAt: null,
      executedBy: null,
      id: 'internal-result-id',
      testCase: {
        expectedResult: null,
        steps: [],
        title: 'Titulo preservado fora da descricao',
      },
      testRun: { name: 'Run sem URL' },
    });

    expect(description).toBe(
      [
        '# Descrição',
        '',
        '## Objetivo:',
        '',
        '',
        '# Passos',
        '',
        '',
        '',
        '# Resultado esperado',
        '',
        '',
        '',
        '# Resultado obtido',
        '',
        '',
        '# Outras informações',
        '',
        '- Reportado por: ',
        '',
        '- Número do caso de teste: ',
        '',
        '- Execução de teste: ',
      ].join('\n'),
    );
    expect(description).not.toMatch(/undefined|null|internal-result-id/i);
    expect(description).not.toMatch(/Projeto|Status|Data|Evid.ncia|Prioridade|Ambiente/i);
    expect(description).not.toContain('https://files/should-not-be-in-description');
  });

  it('preserves original field values while applying only Markdown list formatting', () => {
    const service = new ShortcutFailureStoryService({} as never, {} as ShortcutService);
    const description = service.buildDescription({
      attachments: [],
      comment: 'Texto obtido com **Markdown** e acentuação: ação.',
      executedBy: { name: 'Aline dos Santos' },
      id: 'result-id',
      testCase: {
        expectedResult: '- Primeiro resultado original\n* Segundo resultado original',
        steps: [
          { description: 'Primeiro passo original', order: 10 },
          { description: 'Segundo passo original', order: 20 },
        ],
        title: 'Caso original',
      },
      testRun: { name: 'Run original' },
    });

    expect(description).toContain('1. Primeiro passo original\n2. Segundo passo original');
    expect(description).toContain('- Primeiro resultado original\n- Segundo resultado original');
    expect(description).toContain('Texto obtido com **Markdown** e acentuação: ação.');
    expect(description).toContain('- Reportado por: Aline dos Santos');
  });
});
