import { IsOptional, IsUUID } from 'class-validator';

export class AddTestResultAttachmentsDto {
  @IsOptional()
  @IsUUID()
  testStepId?: string;
}
