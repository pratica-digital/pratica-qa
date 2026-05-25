import { TestResultStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryTestResultsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  testRunId?: string;

  @IsOptional()
  @IsUUID()
  testCaseId?: string;

  @IsOptional()
  @IsEnum(TestResultStatus)
  status?: TestResultStatus;
}
