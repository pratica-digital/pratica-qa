import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const STRONG_PASSWORD_MESSAGE =
  'Password must have at least 8 characters, including uppercase, lowercase, and numbers';

export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  newPassword: string;
}
