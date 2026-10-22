import { IsEnum, IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { InvestorTxType } from '@prisma/client';
import { MONEY_REGEX } from '../../common/money';

/** Fields to record money put in (DEPOSIT) or paid back (PAYOUT). Never edited or deleted. */
export class CreateTransactionDto {
  @IsEnum(InvestorTxType)
  type!: InvestorTxType;

  // Decimal string; must be > 0 (checked in the service, as the regex allows 0).
  @Matches(MONEY_REGEX, { message: 'amount must be a positive decimal string' })
  amount!: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
