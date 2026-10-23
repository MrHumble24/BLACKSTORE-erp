import { IsInt, IsString, Matches, Min } from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Reprice every line of one product model in a batch (manage_prices); re-splits extra costs. */
export class RepriceModelDto {
  @IsInt()
  @Min(1)
  productModelId!: number;

  @IsString()
  @Matches(MONEY_REGEX, { message: 'unitPrice must be a non-negative decimal string' })
  unitPrice!: string;
}
