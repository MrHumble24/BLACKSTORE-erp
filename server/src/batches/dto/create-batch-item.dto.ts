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
import { CreateIdentifierDto } from '../../items/dto/create-identifier.dto';

/** Add one device to a batch; investor and location come from the batch (FR-8). */
export class CreateBatchItemDto {
  @IsInt()
  @Min(1)
  productModelId!: number;

  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateIdentifierDto)
  identifiers!: CreateIdentifierDto[];

  // Needs manage_prices; the line is saved at 0 when omitted and Admin prices it later (W1 step 4).
  @IsOptional()
  @IsString()
  @Matches(MONEY_REGEX, { message: 'purchasePrice must be a non-negative decimal string' })
  purchasePrice?: string;
}
