import { IsOptional, IsString, Matches } from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Set purchase, sale and minimum price (manage_prices). Decimal strings up to 2 decimals. */
export class UpdateItemPricesDto {
  @IsOptional()
  @IsString()
  @Matches(MONEY_REGEX, { message: 'purchasePrice must be a non-negative decimal string' })
  purchasePrice?: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY_REGEX, { message: 'salePrice must be a non-negative decimal string' })
  salePrice?: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY_REGEX, { message: 'minSalePrice must be a non-negative decimal string' })
  minSalePrice?: string;
}
