import { ItemCondition, ItemStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

export enum ItemSortBy {
  CREATED_AT = 'createdAt',
  MODEL = 'model',
  SALE_PRICE = 'salePrice',
  MIN_SALE_PRICE = 'minSalePrice',
  COST = 'cost',
  STATUS = 'status',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/** Filters for the paginated item list; ids arrive as query strings and are coerced. */
export class QueryItemsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  investorId?: number;

  // Matches an identifier value (exact, case-insensitive) or model name (contains).
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isUnpriced?: boolean;

  @IsOptional()
  @IsEnum(ItemSortBy)
  sortBy?: ItemSortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}

