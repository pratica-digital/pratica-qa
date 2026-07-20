import { Injectable, NotFoundException } from '@nestjs/common';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { ProjectsRepository } from '../projects/repositories/projects.repository';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { ImportTestCasesDto } from './dto/import-test-cases.dto';
import { QueryTestSuitesDto } from './dto/query-test-suites.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { TestSuitesRepository } from './repositories/test-suites.repository';
import { validateTestCaseImport } from './test-case-import.validation';

@Injectable()
export class TestSuitesService {
  constructor(
    private readonly testSuitesRepository: TestSuitesRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async create(dto: CreateTestSuiteDto) {
    const projectIds = this.resolveProjectIds(dto);
    await this.ensureProjectsExist(projectIds);

    return this.testSuitesRepository.create(dto, projectIds);
  }

  async findAll(query: QueryTestSuitesDto) {
    const pagination = getPagination(query);
    const [data, total] = await Promise.all([
      this.testSuitesRepository.findMany({
        projectId: query.projectId,
        search: query.search,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.testSuitesRepository.count(query.projectId, query.search),
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

  async findOne(id: string) {
    const suite = await this.testSuitesRepository.findById(id);

    if (!suite) {
      throw new NotFoundException('Test suite not found');
    }

    return suite;
  }

  async update(id: string, dto: UpdateTestSuiteDto) {
    await this.findOne(id);
    const projectIds = this.hasProjectSelection(dto) ? this.resolveProjectIds(dto) : undefined;

    if (projectIds) {
      await this.ensureProjectsExist(projectIds);
    }

    return this.testSuitesRepository.update(id, dto, projectIds);
  }

  async importCases(id: string, dto: ImportTestCasesDto) {
    await this.findOne(id);

    const validation = validateTestCaseImport(dto.cases, {
      requireExpectedResults: dto.requireExpectedResults,
    });

    if (validation.validRows.length === 0) {
      return {
        imported: 0,
        skipped: validation.invalidRowCount,
        ignoredEmptyRows: validation.ignoredEmptyRows,
        errors: validation.errors,
        createdSections: [],
      };
    }

    const importResult = await this.testSuitesRepository.importTestCases(id, validation.validRows);

    return {
      imported: importResult.imported,
      skipped: validation.invalidRowCount,
      ignoredEmptyRows: validation.ignoredEmptyRows,
      errors: validation.errors,
      createdSections: importResult.createdSections,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.testSuitesRepository.delete(id);
  }

  private hasProjectSelection(dto: CreateTestSuiteDto | UpdateTestSuiteDto) {
    return dto.projectIds !== undefined || dto.projectId !== undefined;
  }

  private resolveProjectIds(dto: CreateTestSuiteDto | UpdateTestSuiteDto) {
    return [...new Set(dto.projectIds ?? (dto.projectId ? [dto.projectId] : []))];
  }

  private async ensureProjectsExist(projectIds: string[]) {
    if (projectIds.length === 0) {
      return;
    }

    const projectCount = await this.projectsRepository.countByIds(projectIds);

    if (projectCount !== projectIds.length) {
      throw new NotFoundException('One or more projects were not found');
    }
  }
}
