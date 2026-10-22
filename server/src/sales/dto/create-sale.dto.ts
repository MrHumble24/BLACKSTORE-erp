import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/**
 * One sale line. A device line sets `itemId` (+ optional warranty); an accessory line
 * sets `productModelId` + `quantity`. The service enforces the itemId-xor-productModelId
 * rule and the per-line quantity rules.
 */
export class CreateSaleLineDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  itemId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  productModelId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsString()
  @Matches(MONEY_REGEX, { message: 'unitPrice must be a non-negative decimal string' })
  unitPrice!: string;

  @IsOptional()
  @IsISO8601()
  warrantyUntil?: string;
}

/** Optional cash/card payment taken at sale time; amount must be strictly positive (checked in the service). */
export class SalePaymentInputDto {
  @IsString()
  @Matches(MONEY_REGEX, { message: 'amount must be a non-negative decimal string' })
  amount!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}

/** Create a sale with at least one line (PRD FR-19, W2). */
export class CreateSaleDto {
  @IsInt()
  @Min(1)
  locationId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  lines!: CreateSaleLineDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalePaymentInputDto)
  payment?: SalePaymentInputDto;
}
