import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { LANGUAGES } from '../../common/auth-user';
import type { Language } from '../../common/auth-user';

/** Fields to create a new user account. */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @Length(7, 20)
  phone!: string;

  @IsString()
  @Length(8, 72) // bcrypt ignores bytes after 72
  password!: string;

  @IsInt()
  @Min(1)
  roleId!: number;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: Language;
}
