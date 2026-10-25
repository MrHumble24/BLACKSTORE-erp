import { IsISO8601 } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** Date range for the partner transactions feed (F29); full ISO timestamps in the client's local day bounds. */
export class QueryPartnerTransactionsDto extends PaginationQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
