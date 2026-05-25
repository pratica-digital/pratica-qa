import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CloneTestCaseDto {
  @IsOptional()
  @IsUUID()
  suiteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;
}
