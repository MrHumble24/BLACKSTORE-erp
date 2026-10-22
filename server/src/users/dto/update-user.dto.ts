import {
  IsBoolean,
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

/** Fields that may be changed on an existing user; all optional. */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(7, 20)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(8, 72)
  password?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  roleId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: Language;
}
