import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { getProjectImageUrl, projectImageUploadOptions } from './project-image-upload';
import { ProjectsService } from './projects.service';

type UploadedProjectImage = {
  filename: string;
};

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Post()
  @UseInterceptors(FileInterceptor('image', projectImageUploadOptions))
  create(@Body() dto: CreateProjectDto, @UploadedFile() image?: UploadedProjectImage) {
    return this.projectsService.create({
      ...dto,
      imageUrl: getProjectImageUrl(image) ?? dto.imageUrl,
    });
  }

  @Get()
  findAll(@Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', projectImageUploadOptions))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @UploadedFile() image?: UploadedProjectImage,
  ) {
    return this.projectsService.update(id, {
      ...dto,
      imageUrl: getProjectImageUrl(image) ?? dto.imageUrl,
      removeImage: image ? false : dto.removeImage,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.QA)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(id);
  }
}
