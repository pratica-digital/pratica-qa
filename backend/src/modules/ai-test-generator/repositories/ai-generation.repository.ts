import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AiCoverage,
  AiGeneratedTestCase,
  AiGenerationRecord,
  AiHistoryItem,
  AiRegressionSuiteItem,
  ReleaseAnalysisResult,
} from '../domain/ai-test-generator.types';

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toRecord(row: {
  id: string;
  releaseTitle: string;
  fileName: string;
  releaseHash: string;
  releaseText: string;
  analysis: Prisma.JsonValue;
  testCases: Prisma.JsonValue;
  regressionSuite: Prisma.JsonValue;
  coverage: Prisma.JsonValue;
  provider: string;
  model: string;
  status: string;
  durationMs: number | null;
  casesCreated: number;
  createdById: string | null;
  errorMessage: string;
  createdAt: Date;
  updatedAt: Date;
}): AiGenerationRecord {
  return {
    ...row,
    analysis: row.analysis as ReleaseAnalysisResult,
    testCases: row.testCases as AiGeneratedTestCase[],
    regressionSuite: row.regressionSuite as AiRegressionSuiteItem[],
    coverage: row.coverage as AiCoverage,
  };
}

@Injectable()
export class AiGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createStarted(params: {
    releaseTitle?: string;
    fileName?: string;
    releaseHash: string;
    releaseText: string;
    provider: string;
    model: string;
    createdById?: string;
  }) {
    const row = await this.prisma.aiGeneration.create({
      data: {
        releaseTitle: params.releaseTitle ?? '',
        fileName: params.fileName ?? '',
        releaseHash: params.releaseHash,
        releaseText: params.releaseText,
        analysis: {},
        testCases: [],
        regressionSuite: [],
        coverage: {},
        provider: params.provider,
        model: params.model,
        status: 'PROCESSING',
        createdById: params.createdById,
      },
    });

    return toRecord(row);
  }

  async complete(
    id: string,
    params: {
      analysis: ReleaseAnalysisResult;
      testCases: AiGeneratedTestCase[];
      regressionSuite: AiRegressionSuiteItem[];
      coverage: AiCoverage;
      durationMs: number;
    },
  ) {
    const row = await this.prisma.aiGeneration.update({
      where: { id },
      data: {
        analysis: toJsonInput(params.analysis),
        testCases: toJsonInput(params.testCases),
        regressionSuite: toJsonInput(params.regressionSuite),
        coverage: toJsonInput(params.coverage),
        durationMs: params.durationMs,
        status: 'COMPLETED',
        errorMessage: '',
      },
    });

    return toRecord(row);
  }

  async fail(id: string, errorMessage: string, durationMs: number) {
    const row = await this.prisma.aiGeneration.update({
      where: { id },
      data: {
        durationMs,
        errorMessage,
        status: 'FAILED',
      },
    });

    return toRecord(row);
  }

  async findCached(releaseHash: string, provider: string, model: string) {
    const row = await this.prisma.aiGeneration.findFirst({
      where: {
        releaseHash,
        provider,
        model,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    });

    return row ? toRecord(row) : null;
  }

  async findById(id: string) {
    const row = await this.prisma.aiGeneration.findUnique({
      where: { id },
    });

    return row ? toRecord(row) : null;
  }

  async list(params: { skip: number; take: number }): Promise<AiHistoryItem[]> {
    const rows = await this.prisma.aiGeneration.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => {
      const record = toRecord(row);

      return {
        id: record.id,
        releaseTitle: record.releaseTitle,
        fileName: record.fileName,
        releaseHash: record.releaseHash,
        provider: record.provider,
        model: record.model,
        status: record.status,
        durationMs: record.durationMs,
        casesCreated: record.casesCreated,
        createdById: record.createdById,
        errorMessage: record.errorMessage,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        testCaseCount: record.testCases.length,
      };
    });
  }

  count() {
    return this.prisma.aiGeneration.count();
  }

  async incrementCasesCreated(id: string, count: number) {
    const row = await this.prisma.aiGeneration.update({
      where: { id },
      data: {
        casesCreated: { increment: count },
      },
    });

    return toRecord(row);
  }
}
