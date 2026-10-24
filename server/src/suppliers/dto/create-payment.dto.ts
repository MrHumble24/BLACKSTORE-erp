import { FeePayer } from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';
import { SIGNED_MONEY_REGEX } from '../../common/money';

/**
 * Record a payment to a supplier. Never edited or deleted: a mistake is fixed with a correcting entry.
 * A correction of an investor payment should carry the same investorId and feePaidBy; nothing enforces
 * it (append-only ledger, the correcting row is just another row).
 *
 * The fee never touches item cost or profit share (BR-1: cost = purchase price + FR-18 extra costs).
 * An investor-paid fee is deducted from the investor's money only; a business-paid fee is plain money
 * out (not yet an expense in net profit). Do not also add the fee to the batch's extra costs, or the
 * investor pays it twice.
 */
export class CreatePaymentDto {
  // Signed decimal string; a negative amount is a correcting entry. Must not be 0 (checked in the service).
  @IsString()
  @Matches(SIGNED_MONEY_REGEX, { message: 'amount must be a signed decimal string' })
  amount!: string;

  // Transfer fee paid on top; never part of the supplier balance. Negative only on a correcting entry (service).
  @IsOptional()
  @IsString()
  @Matches(SIGNED_MONEY_REGEX, { message: 'fee must be a signed decimal string' })
  fee?: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // Whose money was sent (F25); omitted = the business's own money.
  @IsOptional()
  @IsInt()
  @IsPositive()
  investorId?: number;

  // Who bears the fee; INVESTOR requires investorId. Defaults to BUSINESS.
  @IsOptional()
  @IsEnum(FeePayer)
  feePaidBy?: FeePayer;
}
