import { Type } from 'class-transformer';
import { IsBooleanString, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** Paginated consignment list; `open=true` keeps only consignments with held items. */
export class QueryConsignmentsDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  partnerId?: number;

  @IsOptional()
  @IsBooleanString()
  open?: string;
}
