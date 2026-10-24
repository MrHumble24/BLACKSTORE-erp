import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ShareType } from '@prisma/client';
import { MONEY_REGEX } from '../../common/money';

/** Fields that may be changed on an investor; isOwn can never change. */
export class UpdateInvestorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsEnum(ShareType)
  shareType?: ShareType;

  @IsOptional()
  @Matches(MONEY_REGEX, { message: 'shareValue must be a non-negative decimal string' })
  shareValue?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Supplier record of the same person (F26); explicit null unlinks (IsOptional lets null through).
  @IsOptional()
  @IsInt()
  @IsPositive()
  supplierId?: number | null;
}
