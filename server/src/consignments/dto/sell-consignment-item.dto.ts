import { PaymentMethod } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

/** Report a partner sale: paid in full now, or on debt. method defaults to CASH when paid. */
export class SellConsignmentItemDto {
  @IsBoolean()
  paid!: boolean;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
