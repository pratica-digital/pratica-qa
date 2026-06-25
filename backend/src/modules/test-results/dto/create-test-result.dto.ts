import { TestResultStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTestResultDto {
  @IsUUID()
  testRunId: string;

  @IsUUID()
  testCaseId: string;

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
}
