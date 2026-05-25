import { TestCaseStatus, TestPriority, TestSeverity } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryTestCasesDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  suiteId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;

  @IsOptional()
  @IsEnum(TestPriority)
  priority?: TestPriority;

  @IsOptional()
  @IsEnum(TestSeverity)
  severity?: TestSeverity;
}
