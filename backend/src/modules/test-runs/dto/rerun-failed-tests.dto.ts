import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RerunFailedTestsDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}
