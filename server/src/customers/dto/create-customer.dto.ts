import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Fields to create a customer. Phone is unique (409 on duplicate). */
export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
