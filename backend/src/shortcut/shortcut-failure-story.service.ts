import { Injectable, Logger } from '@nestjs/common';
import { TestResultStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FailedTestStoryInput } from './shortcut.types';
import { ShortcutService } from './shortcut.service';

@Injectable()
export class ShortcutFailureStoryService {
  private readonly logger = new Logger(ShortcutFailureStoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shortcutService: ShortcutService,
  ) {}

  async createForFailedResult(result: FailedTestStoryInput & { status: TestResultStatus }) {
    if (result.status !== TestResultStatus.FAILED) {
      return;
    }

    try {
      const current = await this.prisma.testResult.findUnique({
        where: { id: result.id },
        select: { shortcutStoryId: true },
      });

      if (!current || current.shortcutStoryId) {
        return;
      }

      const story = await this.shortcutService.createStory({
        name: `[BUG] ${result.testCase.title}`,
        description: this.buildDescription(result),
        storyType: 'bug',
      });

      if (!story) {
        return;
      }

      await this.prisma.testResult.update({
        where: { id: result.id },
        data: {
          shortcutCreatedAt: new Date(),
          shortcutStoryId: story.id,
          shortcutStoryName: story.name,
          shortcutStoryUrl: story.appUrl,
        },
      });

      this.logger.log(
        JSON.stringify({
          event: 'shortcut.story.created',
          shortcutStoryId: story.id,
          testResultId: result.id,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'shortcut.story.creation_failed',
          reason: error instanceof Error ? error.message : 'unknown_error',
          testResultId: result.id,
        }),
      );
    }
  }

  buildDescription(result: FailedTestStoryInput) {
    const asText = (value: unknown) => (typeof value === 'string' ? value : '');
    const testCase = result.testCase as FailedTestStoryInput['testCase'] & {
      description?: unknown;
      number?: unknown;
      position?: unknown;
    };
    const testRun = result.testRun as FailedTestStoryInput['testRun'] & {
      url?: unknown;
    };
    const objective = asText(testCase.description);
    const actualResult = asText(result.comment);
    const reportedBy = asText(result.executedBy?.name);
    const testCaseNumber = asText(testCase.number) ||
      (typeof testCase.position === 'number' && Number.isFinite(testCase.position)
        ? String(testCase.position)
        : '');
    const steps = (testCase.steps ?? [])
      .map((step, index) => {
        const description = asText(step.description).replace(/\r?\n/g, '\n   ');
        return `${index + 1}. ${description}`;
      })
      .join('\n');
    const expectedResult = asText(testCase.expectedResult)
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => `- ${line.replace(/^\s*[-*+]\s+/, '')}`)
      .join('\n');
    const testRunUrl = asText(testRun.url);
    let testRunLink = '';

    try {
      const parsedTestRunUrl = new URL(testRunUrl);

      if (parsedTestRunUrl.protocol === 'http:' || parsedTestRunUrl.protocol === 'https:') {
        testRunLink = `[${testRunUrl}](${testRunUrl})`;
      }
    } catch {
      // Mantém o campo vazio quando não há uma URL válida disponível.
    }

    return [
      '# Descrição',
      '',
      '## Objetivo:',
      objective,
      '',
      '# Passos',
      '',
      steps,
      '',
      '# Resultado esperado',
      '',
      expectedResult,
      '',
      '# Resultado obtido',
      actualResult,
      '',
      '# Outras informações',
      '',
      `- Reportado por: ${reportedBy}`,
      '',
      `- Número do caso de teste: ${testCaseNumber}`,
      '',
      `- Execução de teste: ${testRunLink}`,
    ].join('\n');
  }

}
