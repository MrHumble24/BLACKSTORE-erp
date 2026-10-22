import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Fields to create a supplier. Name is unique (409 on duplicate). */
export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

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
}
