import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Add quantity to a (model, location) accessory row, creating it if missing. */
export class CreateAccessoryStockDto {
  @IsInt()
  @Min(1)
  productModelId!: number;

  @IsInt()
  @Min(1)
  locationId!: number;

  @IsInt()
  @Min(1)
  @Max(100_000)
  quantity!: number;

  // Needs manage_prices; drives avgCost recomputation. Decimal string up to 2 decimals.
  @IsOptional()
  @IsString()
  @Matches(MONEY_REGEX, { message: 'unitCost must be a non-negative decimal string' })
  unitCost?: string;
}
