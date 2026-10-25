import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';
import { STOCK_LEVELS, type StockLevel } from '../low-stock';

/** Filters for the paginated accessory-stock list. */
export class QueryAccessoryStockDto extends PaginationQueryDto {
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
  productModelId?: number;

  // Narrow the list by stock level; default ALL (no filter).
  @IsOptional()
  @IsIn(STOCK_LEVELS)
  stockLevel?: StockLevel;
}
