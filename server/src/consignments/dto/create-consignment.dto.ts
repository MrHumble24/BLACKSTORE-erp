import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** One item handed to the partner with the price the partner owes us (BR-7); minPrice > 0 is checked in the service. */
export class ConsignmentItemInputDto {
  @IsInt()
  @Min(1)
  itemId!: number;

  @IsString()
  @Matches(MONEY_REGEX, { message: 'minPrice must be a non-negative decimal string' })
  minPrice!: string;
}

/** Hand over up to 200 in-stock items to a partner (FR-26, W4). */
export class CreateConsignmentDto {
  @IsInt()
  @Min(1)
  partnerId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ConsignmentItemInputDto)
  items!: ConsignmentItemInputDto[];

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
