import { ReturnResult } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Return a sale line (PRD FR-23). Device lines always return quantity 1; accessories may return part. */
export class CreateReturnDto {
  @IsInt()
  @Min(1)
  saleItemId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsString()
  @Matches(MONEY_REGEX, { message: 'refundAmount must be a non-negative decimal string' })
  refundAmount!: string;

  @IsEnum(ReturnResult)
  result!: ReturnResult;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
