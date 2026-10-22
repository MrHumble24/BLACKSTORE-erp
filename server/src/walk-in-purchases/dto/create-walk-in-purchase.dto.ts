import { ItemCondition } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';
import { CreateIdentifierDto } from '../../items/dto/create-identifier.dto';

/** The person we are buying a device from; matched/reused by trimmed phone. */
export class WalkInSellerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(20)
  @Matches(/^\+?\d{7,15}$/, { message: 'phone must be 7–15 digits, optionally prefixed with +' })
  phone!: string;
}

/** Buy a device from a walk-in seller (FR-25, W5). Known SOLD identifier triggers a buy-back. */
export class CreateWalkInPurchaseDto {
  @ValidateNested()
  @Type(() => WalkInSellerDto)
  seller!: WalkInSellerDto;

  @IsInt()
  @Min(1)
  productModelId!: number;

  @IsInt()
  @Min(1)
  locationId!: number;

  // Defaults to the business (isOwn) investor when omitted.
  @IsOptional()
  @IsInt()
  @Min(1)
  investorId?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateIdentifierDto)
  identifiers!: CreateIdentifierDto[];

  @IsEnum(ItemCondition)
  condition!: ItemCondition;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;

  // Staff hand over the cash, so they may enter pricePaid without manage_prices (W5 step 2).
  @IsString()
  @Matches(MONEY_REGEX, { message: 'pricePaid must be a non-negative decimal string' })
  pricePaid!: string;
}
