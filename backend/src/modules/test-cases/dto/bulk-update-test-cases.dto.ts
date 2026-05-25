import { TestCaseStatus } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsUUID } from 'class-validator';

export class BulkUpdateTestCasesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID(undefined, { each: true })
  ids: string[];

  @IsEnum(TestCaseStatus)
  status: TestCaseStatus;
}
