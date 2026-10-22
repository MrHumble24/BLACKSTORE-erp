import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsString, Matches } from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Record a payment against a debt sale (PRD FR-21, W3); amount is validated 0 < amount ≤ balance in the service. */
export class CreateSalePaymentDto {
  @IsString()
  @Matches(MONEY_REGEX, { message: 'amount must be a non-negative decimal string' })
  amount!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
