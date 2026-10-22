import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Add accessories to a batch; they land at the batch's location. */
export class CreateBatchAccessoryDto {
  @IsInt()
  @Min(1)
  productModelId!: number;

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
