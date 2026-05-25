import { Injectable, NotFoundException } from '@nestjs/common';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './repositories/projects.repository';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  create(dto: CreateProjectDto) {
    return this.projectsRepository.create(dto);
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
    await this.findOne(id);
    return this.projectsRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.projectsRepository.delete(id);
  }
}
