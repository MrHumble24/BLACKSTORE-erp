import { CostSplitMethod } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Edit a batch header. extraCostTotal / costSplitMethod need manage_prices and re-split the lines. */
export class UpdateBatchDto {
  @IsOptional()
  @IsISO8601()
  arrivalDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY_REGEX, { message: 'extraCostTotal must be a non-negative decimal string' })
  extraCostTotal?: string;

  @IsOptional()
  @IsEnum(CostSplitMethod)
  costSplitMethod?: CostSplitMethod;
}
