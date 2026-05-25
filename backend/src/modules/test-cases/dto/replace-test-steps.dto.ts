import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { CreateTestStepDto } from './create-test-step.dto';

export class ReplaceTestStepsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateTestStepDto)
  steps: CreateTestStepDto[];
}
