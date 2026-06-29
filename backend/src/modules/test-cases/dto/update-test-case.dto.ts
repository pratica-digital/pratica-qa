import { TestCaseStatus, TestPriority, TestSeverity } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTestCaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  preconditions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  expectedResult?: string;

  @IsOptional()
  @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;

  @IsOptional()
  @IsEnum(TestSeverity)
  severity?: TestSeverity;

  @IsOptional()
  @IsEnum(TestPriority)
  priority?: TestPriority;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}
