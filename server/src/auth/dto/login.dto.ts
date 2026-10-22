import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Phone + password submitted at login. */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72) // bcrypt ignores bytes after 72
  password!: string;
}
