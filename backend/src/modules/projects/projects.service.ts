import { Injectable, NotFoundException } from '@nestjs/common';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { removeRuntimeUpload } from '../../common/files/runtime-upload-storage';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './repositories/projects.repository';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async create(dto: CreateProjectDto) {
    const key = dto.key ?? await this.createUniqueProjectKey(dto.name);

    try {
      return await this.projectsRepository.create({ ...dto, key });
    } catch (error) {
      await removeRuntimeUpload(dto.imageUrl);
      throw error;
    }
  }

  async findAll(query: QueryProjectsDto) {
    const pagination = getPagination(query);
    const [data, total] = await Promise.all([
      this.projectsRepository.findMany({
        search: query.search,
        status: query.status,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.projectsRepository.count(query.search, query.status),
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
    const project = await this.projectsRepository.findById(id);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const current = await this.findOne(id);

    try {
      const updated = await this.projectsRepository.update(id, dto);
      const imageWasReplaced = dto.imageUrl !== undefined && dto.imageUrl !== current.imageUrl;

      if ((imageWasReplaced || dto.removeImage) && current.imageUrl) {
        await removeRuntimeUpload(current.imageUrl);
      }

      return updated;
    } catch (error) {
      if (dto.imageUrl && dto.imageUrl !== current.imageUrl) {
        await removeRuntimeUpload(dto.imageUrl);
      }

      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.projectsRepository.delete(id);
  }

  private async createUniqueProjectKey(name: string) {
    const baseKey = this.normalizeProjectKey(name);

    for (let index = 0; index < 100; index += 1) {
      const suffix = index === 0 ? '' : `_${index + 1}`;
      const candidate = `${baseKey.slice(0, 24 - suffix.length)}${suffix}`;
      const existingProject = await this.projectsRepository.findByKey(candidate);

      if (!existingProject) {
        return candidate;
      }
    }

    return `${baseKey.slice(0, 15)}_${Date.now().toString(36).toUpperCase()}`.slice(0, 24);
  }

  private normalizeProjectKey(value: string) {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]+/g, '_')
      .replace(/^[^A-Z0-9]+/, '')
      .replace(/[^A-Z0-9]+$/, '');

    return normalized.length > 0 ? normalized.slice(0, 24) : 'PROJECT';
  }
}
