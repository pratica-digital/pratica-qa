import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class AiGeneratedStepDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descricao: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resultado_esperado?: string;
}

export class AiGeneratedTestCaseDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  pre_condicoes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AiGeneratedStepDto)
  passos: AiGeneratedStepDto[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resultado_esperado?: string;

  @IsOptional()
  @IsString()
  prioridade?: string;

  @IsOptional()
  @IsString()
  severidade?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  modulo?: string;

  @IsOptional()
  @IsString()
  tipo_teste?: string;

  @IsOptional()
  @IsString()
  teste_positivo?: string;

  @IsOptional()
  @IsString()
  teste_negativo?: string;

  @IsOptional()
  @IsString()
  regressao?: string;

  @IsOptional()
  @IsString()
  automacao?: string;

  @IsOptional()
  @IsString()
  risco?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dados_teste?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  funcionalidades_afetadas?: string[];

  @IsOptional()
  @IsString()
  origem_release?: string;

  @IsOptional()
  @IsString()
  trecho_release?: string;

  @IsOptional()
  @IsString()
  complexidade?: string;

  @IsOptional()
  @IsString()
  probabilidade_regressao?: string;
}

export class SaveAiTestCasesDto {
  @IsUUID()
  suiteId: string;

  @IsOptional()
  @IsUUID()
  generationId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AiGeneratedTestCaseDto)
  cases: AiGeneratedTestCaseDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedCaseIds?: string[];
}
