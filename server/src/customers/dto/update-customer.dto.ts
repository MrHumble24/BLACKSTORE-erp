import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Editable customer fields; no delete (BR-12). */
export class UpdateCustomerDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
