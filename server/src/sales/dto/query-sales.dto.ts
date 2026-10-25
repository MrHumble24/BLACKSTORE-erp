import { SaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsISO8601, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** Filters for the paginated sales list; `to` is inclusive of that day (applied in the service). */
export class QuerySalesDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number;

  // When given, returns only that partner's sales; without it partner sales stay hidden.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  partnerId?: number;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  // F33: true = confirmed at a close, false = waiting for confirmation.
  @IsOptional()
  @IsIn(['true', 'false'])
  confirmed?: 'true' | 'false';
}
