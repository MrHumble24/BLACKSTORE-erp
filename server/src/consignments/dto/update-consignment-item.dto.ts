import { IsString, Matches } from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Change a held item's minimum price (BR-7); only while the item is AT_PARTNER. */
export class UpdateConsignmentItemDto {
  @IsString()
  @Matches(MONEY_REGEX, { message: 'minPrice must be a non-negative decimal string' })
  minPrice!: string;
}
