import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderTestSuiteCasesDto {
  @IsArray()
  @ArrayMaxSize(10000)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  caseIds: string[];
}
