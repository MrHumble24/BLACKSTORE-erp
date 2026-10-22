import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Fields that may be changed on a category; all optional. */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isSerialized?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
