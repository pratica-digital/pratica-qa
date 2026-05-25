import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AddTestResultAttachmentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  attachments: string[];
}
