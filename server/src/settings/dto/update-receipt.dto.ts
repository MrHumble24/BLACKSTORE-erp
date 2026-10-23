import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Base64 image data URL, or empty string to clear the logo. */
const LOGO_PATTERN = /^$|^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

/** Receipt header fields and part toggles (PRD FR-24); every field optional on PATCH. */
export class UpdateReceiptDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  shopName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  headerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  taxId?: string;

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
  secondContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  footer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(700000)
  @Matches(LOGO_PATTERN, { message: 'logo must be empty or a base64 image data URL' })
  logo?: string;

  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @IsOptional()
  @IsBoolean()
  showHeaderNote?: boolean;

  @IsOptional()
  @IsBoolean()
  showTaxId?: boolean;

  @IsOptional()
  @IsBoolean()
  showAddress?: boolean;

  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @IsOptional()
  @IsBoolean()
  showSecondContact?: boolean;

  @IsOptional()
  @IsBoolean()
  showWebsite?: boolean;

  @IsOptional()
  @IsBoolean()
  showCustomer?: boolean;

  @IsOptional()
  @IsBoolean()
  showWarranty?: boolean;

  @IsOptional()
  @IsBoolean()
  showFooter?: boolean;
}
