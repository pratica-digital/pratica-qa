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
    expectedResult: 'Operacao concluida.',
    steps: [
      {
        description: 'Executar acao principal',
        expectedResult: 'Acao processada',
        order: 1,
      },
    ],
    title: 'Validar fluxo principal',
  },
  testRun: {
    name: 'Regression Run',
    project: { name: 'QA Platform' },
  },
};

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
        name: '[FAIL] Validar fluxo principal',
      }),
    } as unknown as ShortcutService;
    const service = new ShortcutFailureStoryService(prisma as never, shortcut);

    await service.createForFailedResult(failedResult);

    expect(shortcut.createStory).toHaveBeenCalledWith({
      name: '[FAIL] Validar fluxo principal',
      description: expect.stringContaining('Resultado:\nFAILED'),
      storyType: 'bug',
    });
    expect(prisma.testResult.update).toHaveBeenCalledWith({
      where: { id: 'result-id' },
      data: {
        shortcutCreatedAt: expect.any(Date),
        shortcutStoryId: '123',
        shortcutStoryName: '[FAIL] Validar fluxo principal',
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
});
