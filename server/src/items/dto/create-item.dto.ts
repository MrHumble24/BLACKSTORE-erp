import { ItemCondition } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';
import { CreateIdentifierDto } from './create-identifier.dto';

/** Receive one serialized device (opening stock or a batch line). */
export class CreateItemDto {
  @IsInt()
  @Min(1)
  productModelId!: number;

  @IsInt()
  @Min(1)
  investorId!: number;

  @IsInt()
  @Min(1)
  locationId!: number;

  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  // Values are validated against the category's attributes in the service.
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateIdentifierDto)
  identifiers!: CreateIdentifierDto[];

  // Price fields need manage_prices; decimal strings up to 2 decimals.
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
