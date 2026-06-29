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
        name: `[FAIL] ${result.testCase.title}`,
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
    const projectName = result.testRun.project?.name ?? 'Nao informado';
    const executedBy = result.executedBy?.name ?? result.executedBy?.email ?? 'Nao informado';
    const executedAt = result.executedAt
      ? new Date(result.executedAt).toISOString()
      : new Date().toISOString();
    const comment = result.comment?.trim() || 'Nao informado';
    const steps = this.formatSteps(result.testCase.steps ?? []);
    const evidences = this.formatEvidences(result.attachments);

    return [
      'Projeto:',
      projectName,
      '',
      'Test Run:',
      result.testRun.name,
      '',
      'Caso de Teste:',
      result.testCase.title,
      '',
      'Resultado:',
      'FAILED',
      '',
      'Passos:',
      steps,
      '',
      'Resultado Esperado:',
      result.testCase.expectedResult?.trim() || 'Nao informado',
      '',
      'Resultado Obtido:',
      comment,
      '',
      'Observacoes:',
      comment,
      '',
      'Executor:',
      executedBy,
      '',
      'Data:',
      executedAt,
      evidences ? ['', 'Evidencias:', evidences] : [],
    ].flat().join('\n');
  }

  private formatSteps(steps: NonNullable<FailedTestStoryInput['testCase']['steps']>) {
    if (steps.length === 0) {
      return 'Nao informado';
    }

    return steps
      .map((step) => {
        const expected = step.expectedResult?.trim()
          ? `\n   Resultado esperado: ${step.expectedResult.trim()}`
          : '';
        return `${step.order}. ${step.description}${expected}`;
      })
      .join('\n');
  }

  private formatEvidences(attachments: FailedTestStoryInput['attachments']) {
    return attachments
      .map((attachment) => {
        const label = attachment.originalName?.trim() || attachment.url;
        return `- ${label}: ${attachment.url}`;
      })
      .join('\n');
  }
}
