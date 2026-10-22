import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
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
}
