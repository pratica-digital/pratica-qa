import { TestPriority } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TestPlanSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  content: string;

  @IsOptional()
  @IsEnum(TestPriority)
  priority?: TestPriority;
}
