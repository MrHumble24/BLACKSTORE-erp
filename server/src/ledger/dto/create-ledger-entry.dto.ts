import { LedgerType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Record an income or expense in the ledger (FR-27). Sales income is not entered here. */
export class CreateLedgerEntryDto {
  @IsEnum(LedgerType)
  type!: LedgerType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 50)
  category!: string;

  // Positive amount; the > 0 check lives in the service (MONEY_REGEX also allows 0).
  @IsString()
  @Matches(MONEY_REGEX, { message: 'amount must be a positive decimal string' })
  amount!: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // Only meaningful for INCOME; forced to false for EXPENSE in the service (BR-5).
  @IsOptional()
  @IsBoolean()
  countsInProfit?: boolean;

  // true = cash drawer, false = bank/card. Drives F13 reconciliation; defaults true in the service.
  @IsOptional()
  @IsBoolean()
  inCash?: boolean;
}
