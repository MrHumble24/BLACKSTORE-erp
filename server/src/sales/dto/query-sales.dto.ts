import { SaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, Min } from 'class-validator';
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

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
