import { TestResultStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTestResultStepDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  @MaxLength(8000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  expectedResult?: string;
}

export class UpdateTestResultDto {
  @IsOptional()
  @IsUUID()
  executedById?: string;

  @IsOptional()
  @IsEnum(TestResultStatus)
  status?: TestResultStatus;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  expectedResult?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTestResultStepDto)
  steps?: UpdateTestResultStepDto[];
}
