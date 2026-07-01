import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TestCaseStatus, TestPriority, TestSeverity } from '@prisma/client';
import { getPagination, PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { TestCasesService } from '../test-cases/test-cases.service';
import { AnalyzeReleaseDto } from './dto/analyze-release.dto';
import { CaseActionDto } from './dto/case-action.dto';
import { GenerateTestCasesDto } from './dto/generate-test-cases.dto';
import { AiGeneratedTestCaseDto, SaveAiTestCasesDto } from './dto/save-ai-test-cases.dto';
import { AiGeneratedTestCase } from './domain/ai-test-generator.types';
import { AiGenerationRepository } from './repositories/ai-generation.repository';
import { AiSettingsService } from './services/ai-settings.service';
import { AiJsonService } from './services/ai-json.service';
import { LLMService } from './services/llm.service';
import { ReleaseNotesExtractorService } from './services/release-notes-extractor.service';

type UploadedReleaseFile = {
  buffer?: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
};

function truncate(value: string | undefined, maxLength: number) {
  const normalized = (value ?? '').trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength - 1) : normalized;
}

function normalizeSeverity(value: string | undefined): TestSeverity {
  const normalized = (value ?? '').toLowerCase();

  if (normalized.includes('critic') || normalized.includes('bloque')) {
    return TestSeverity.CRITICAL;
  }

  if (normalized.includes('alt')) {
    return TestSeverity.HIGH;
  }

  if (normalized.includes('baix')) {
    return TestSeverity.LOW;
  }

  return TestSeverity.MEDIUM;
}

function normalizePriority(value: string | undefined): TestPriority {
  const normalized = (value ?? '').toLowerCase();

  if (normalized.includes('alt') || normalized.includes('critic')) {
    return TestPriority.HIGH;
  }

  if (normalized.includes('baix')) {
    return TestPriority.LOW;
  }

  return TestPriority.MEDIUM;
}

function uniqueTags(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => (value ?? '').trim().toLowerCase()).filter(Boolean))]
    .slice(0, 20)
    .map((tag) => tag.replace(/\s+/g, '-'));
}

@Injectable()
export class AiTestGeneratorService {
  constructor(
    private readonly extractorService: ReleaseNotesExtractorService,
    private readonly settingsService: AiSettingsService,
    private readonly jsonService: AiJsonService,
    private readonly llmService: LLMService,
    private readonly generationRepository: AiGenerationRepository,
    private readonly testCasesService: TestCasesService,
  ) {}

  extractRelease(file?: UploadedReleaseFile) {
    if (!file) {
      throw new BadRequestException('Release Notes file is required.');
    }

    return this.extractorService.extract(file);
  }

  async analyze(dto: AnalyzeReleaseDto) {
    const hash = this.extractorService.hash(dto.releaseNotes);
    const runtimeConfig = await this.settingsService.getRuntimeConfig();
    const analysis = await this.llmService.analyzeRelease(dto.releaseNotes, runtimeConfig);

    return {
      releaseHash: hash,
      provider: runtimeConfig.provider,
      model: runtimeConfig.model,
      analysis,
      sections: this.extractorService.detectSections(dto.releaseNotes),
    };
  }

  async generate(dto: GenerateTestCasesDto, user?: AuthenticatedUser) {
    const startedAt = Date.now();
    const releaseHash = this.extractorService.hash(dto.releaseNotes);
    const runtimeConfig = await this.settingsService.getRuntimeConfig();
    const canUseCache = dto.useCache !== false && !dto.analysis;

    if (canUseCache) {
      const cached = await this.generationRepository.findCached(
        releaseHash,
        runtimeConfig.provider,
        runtimeConfig.model,
      );

      if (cached) {
        return {
          ...cached,
          cached: true,
        };
      }
    }

    const generation = await this.generationRepository.createStarted({
      releaseTitle: dto.releaseTitle,
      fileName: dto.fileName,
      releaseHash,
      releaseText: dto.releaseNotes,
      provider: runtimeConfig.provider,
      model: runtimeConfig.model,
      createdById: user?.id,
    });

    try {
      const analysis = dto.analysis
        ? this.jsonService.normalizeAnalysis(dto.analysis)
        : await this.llmService.analyzeRelease(dto.releaseNotes, runtimeConfig);
      const generated = await this.llmService.generateTestCasesFromAnalysis(analysis, runtimeConfig);
      const completed = await this.generationRepository.complete(generation.id, {
        analysis,
        testCases: generated.test_cases,
        regressionSuite: generated.regression_suite,
        coverage: generated.cobertura,
        durationMs: Date.now() - startedAt,
      });

      return {
        ...completed,
        cached: false,
      };
    } catch (error) {
      await this.generationRepository.fail(
        generation.id,
        error instanceof Error ? error.message : 'AI generation failed.',
        Date.now() - startedAt,
      );
      throw error;
    }
  }

  async listHistory(query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const [data, total] = await Promise.all([
      this.generationRepository.list({ skip: pagination.skip, take: pagination.take }),
      this.generationRepository.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.take,
      },
    };
  }

  async findHistory(id: string) {
    const generation = await this.generationRepository.findById(id);

    if (!generation) {
      throw new NotFoundException('AI generation not found.');
    }

    return generation;
  }

  async regenerate(id: string, user?: AuthenticatedUser) {
    const generation = await this.findHistory(id);

    return this.generate(
      {
        releaseNotes: generation.releaseText,
        releaseTitle: generation.releaseTitle,
        fileName: generation.fileName,
        useCache: false,
      },
      user,
    );
  }

  async runCaseAction(dto: CaseActionDto) {
    const testCase = this.jsonService.normalizeTestCase(dto.testCase);
    return this.llmService.generateCaseAction(dto.action, testCase, dto.context ?? '');
  }

  async saveCases(dto: SaveAiTestCasesDto) {
    const selectedIds = new Set(dto.selectedCaseIds ?? dto.cases.map((testCase) => testCase.id).filter(Boolean));
    const selectedCases = dto.selectedCaseIds?.length
      ? dto.cases.filter((testCase) => selectedIds.has(testCase.id ?? ''))
      : dto.cases;

    if (selectedCases.length === 0) {
      throw new BadRequestException('Select at least one AI generated case to save.');
    }

    const createdCases = [];

    for (const testCase of selectedCases) {
      const created = await this.testCasesService.create(this.toCreateTestCasePayload(dto.suiteId, testCase));
      createdCases.push(created);
    }

    if (dto.generationId) {
      await this.generationRepository.incrementCasesCreated(dto.generationId, createdCases.length);
    }

    return {
      created: createdCases,
      count: createdCases.length,
    };
  }

  private toCreateTestCasePayload(suiteId: string, testCase: AiGeneratedTestCaseDto) {
    const normalized = this.jsonService.normalizeTestCase(testCase as AiGeneratedTestCase);
    const traceability = [
      normalized.descricao,
      normalized.origem_release ? `Origem release: ${normalized.origem_release}` : '',
      normalized.trecho_release ? `Trecho release: ${normalized.trecho_release}` : '',
      normalized.risco ? `Risco: ${normalized.risco}` : '',
      normalized.automacao ? `Automacao: ${normalized.automacao}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      suiteId,
      title: truncate(normalized.titulo, 180),
      description: truncate(traceability, 4000),
      preconditions: truncate(normalized.pre_condicoes, 4000),
      expectedResult: truncate(normalized.resultado_esperado, 4000),
      status: TestCaseStatus.ACTIVE,
      priority: normalizePriority(normalized.prioridade),
      severity: normalizeSeverity(normalized.severidade),
      tags: uniqueTags([
        'ai',
        normalized.categoria,
        normalized.modulo,
        normalized.tipo_teste,
        normalized.origem_release,
        normalized.regressao?.toLowerCase().includes('sim') ? 'regressao' : undefined,
        normalized.automacao?.toLowerCase().includes('sim') ? 'automacao' : undefined,
      ]),
      steps: normalized.passos.map((step, index) => ({
        order: index + 1,
        description: truncate(step.descricao, 2000),
        expectedResult: truncate(step.resultado_esperado, 2000),
      })),
    };
  }
}
