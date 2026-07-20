import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TestRunTestType } from '@prisma/client';

export class CreateTestRunTypeDto {
  @IsEnum(TestRunTestType)
  type: TestRunTestType;

  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  suites: string[];
}

export class CreateTestRunDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  testPlanId?: string;

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsUUID()
  assignedToId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  suiteIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CreateTestRunTypeDto)
  testTypes?: CreateTestRunTypeDto[];
}
