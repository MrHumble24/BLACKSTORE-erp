import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';

/** One accessory line of a transfer: how many units of a product model to move. */
export class TransferAccessoryDto {
  @IsInt()
  @Min(1)
  productModelId!: number;

  @IsInt()
  @Min(1)
  @Max(100_000)
  quantity!: number;
}

/** Move devices and/or accessory quantities from one location to another (FR-5, W6). */
export class CreateTransferDto {
  @IsInt()
  @Min(1)
  fromLocationId!: number;

  @IsInt()
  @Min(1)
  toLocationId!: number;

  // Device item ids; duplicates and "at least one line" are checked in the service.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  itemIds?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferAccessoryDto)
  accessories?: TransferAccessoryDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
