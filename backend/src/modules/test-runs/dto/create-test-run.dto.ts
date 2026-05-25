import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTestRunDto {
  @IsUUID()
  projectId: string;

  @IsUUID()
  testPlanId: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  suiteIds: string[];
}
