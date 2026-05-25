import { IsUUID } from 'class-validator';

export class AssignTestRunDto {
  @IsUUID()
  assignedToId: string;
}
