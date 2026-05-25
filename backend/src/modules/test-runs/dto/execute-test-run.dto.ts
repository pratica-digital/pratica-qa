import { TestResultStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ExecuteTestRunDto {
  @IsOptional()
  @IsUUID()
  testResultId?: string;

  @IsOptional()
  @IsUUID()
  testCaseId?: string;

  @IsEnum(TestResultStatus)
  status: TestResultStatus;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  comment?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  attachments?: string[];
}
