import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class ImportTestCaseStepDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  expectedResult?: string;
}

export class ImportTestCaseRowDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rowNumber?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  expectedResults?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTestCaseStepDto)
  testSteps?: ImportTestCaseStepDto[];
}

export class ImportTestCasesDto {
  @IsOptional()
  @IsBoolean()
  requireExpectedResults?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => ImportTestCaseRowDto)
  cases: ImportTestCaseRowDto[];
}
