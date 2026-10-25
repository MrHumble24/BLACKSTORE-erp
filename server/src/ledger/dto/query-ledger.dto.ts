import { ExpenseStatus, LedgerType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** Filters for the paginated ledger list; totals are summed over the whole filter. */
export class QueryLedgerDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LedgerType)
  type?: LedgerType;

  // Expense decision filter (F27); INCOME rows are always CONFIRMED.
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
