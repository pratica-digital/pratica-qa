import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTestStepDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  action: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  expectedResult?: string;
}
