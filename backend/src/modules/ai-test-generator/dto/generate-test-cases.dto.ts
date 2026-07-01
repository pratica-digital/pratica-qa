import { Allow, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateTestCasesDto {
  @IsString()
  @IsNotEmpty()
  releaseNotes: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  releaseTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsBoolean()
  useCache?: boolean;

  @IsOptional()
  @Allow()
  analysis?: unknown;
}
