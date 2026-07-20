import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

export class CreateTestSuiteDto {
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(/^(?!untitled$).+/i, { message: 'Suite name cannot be Untitled' })
  @MaxLength(160)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}
