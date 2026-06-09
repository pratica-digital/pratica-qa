import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

export class RequestPasswordRecoveryDto {
  @IsEmail()
  @MaxLength(180)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;
}
