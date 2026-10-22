import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Editable supplier fields; deactivate instead of deleting (BR-12). */
export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
