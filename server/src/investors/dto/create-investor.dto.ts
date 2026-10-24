import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ShareType } from '@prisma/client';
import { MONEY_REGEX } from '../../common/money';

/** Fields to create an investor. isOwn is never set here (only the seeded OWN row is true). */
export class CreateInvestorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @IsEnum(ShareType)
  shareType!: ShareType;

  // Decimal string with up to 2 decimals; range checked per shareType in the service.
  @IsOptional()
  @Matches(MONEY_REGEX, { message: 'shareValue must be a non-negative decimal string' })
  shareValue?: string;

  // Links a supplier of the same name, reused if unlinked or created (F26). Omitted = no supplier.
  @IsOptional()
  @IsBoolean()
  shipsDevices?: boolean;
}
