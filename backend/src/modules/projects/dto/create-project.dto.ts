import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ProjectStatus, ProjectCategory } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(24)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsNotEmpty()
  @IsEnum(ProjectCategory)
  category: ProjectCategory;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;
}
