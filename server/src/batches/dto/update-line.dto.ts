import { IsString, Matches } from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Set a purchase line's unit price (manage_prices); re-splits the batch's extra costs. */
export class UpdateLineDto {
  @IsString()
  @Matches(MONEY_REGEX, { message: 'unitPrice must be a non-negative decimal string' })
  unitPrice!: string;
}
