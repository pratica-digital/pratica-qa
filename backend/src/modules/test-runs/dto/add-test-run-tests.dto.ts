import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsUUID } from 'class-validator';

export class AddTestRunTestsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  testSuiteIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10000)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  testCaseIds?: string[];
}
