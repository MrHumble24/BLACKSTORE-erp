import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** Filters for the profit report; `to` is inclusive. Lines are paginated, totals/groups cover the filter. */
export class QueryProfitDto extends PaginationQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  investorId?: number;

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

  /** Low-margin watchlist threshold: SALE lines below this gross margin % are flagged. Default 10. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  lowMarginPct: number = 10;
}
