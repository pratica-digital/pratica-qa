import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyzeReleaseDto {
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
}
