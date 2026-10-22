import { IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MONEY_REGEX, SIGNED_MONEY_REGEX } from '../../common/money';

/** Record a payment to a supplier. Never edited or deleted: a mistake is fixed with a correcting entry. */
export class CreatePaymentDto {
  // Signed decimal string; a negative amount is a correcting entry. Must not be 0 (checked in the service).
  @IsString()
  @Matches(SIGNED_MONEY_REGEX, { message: 'amount must be a signed decimal string' })
  amount!: string;

  // Transfer fee paid on top; stored but never part of the balance. Non-negative.
  @IsOptional()
  @IsString()
  @Matches(MONEY_REGEX, { message: 'fee must be a non-negative decimal string' })
  fee?: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
