import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** Filters for the paginated batch list. */
export class QueryBatchesDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;
}
