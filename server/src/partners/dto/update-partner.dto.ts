import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

/** Editable partner fields; no delete (BR-12). */
export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone?: string;

  // null clears the field; undefined leaves it unchanged.
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(120)
  marketLocation?: string | null;

  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
