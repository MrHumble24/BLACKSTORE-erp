import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Fields to create a partner shop (FR-26). */
export class CreatePartnerDto {
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
  @MaxLength(120)
  marketLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
