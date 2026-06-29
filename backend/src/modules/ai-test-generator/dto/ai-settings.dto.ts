import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class UpdateAiSettingsDto {
  @IsIn(['openrouter'])
  provider: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  temperature: number;

  @IsInt()
  @Min(1)
  maxTokens: number;

  @IsInt()
  @Min(1)
  timeoutSeconds: number;

  @IsInt()
  @Min(1)
  @Max(10)
  retries: number;

  @IsBoolean()
  streaming: boolean;

  @IsString()
  promptBase: string;

  @IsString()
  promptUser: string;
}
