import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Receipt header fields (PRD FR-24); every field optional on PATCH, each a string ≤ 200 chars. */
export class UpdateReceiptDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  shopName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  footer?: string;
}
