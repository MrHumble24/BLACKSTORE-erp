import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** Paginated customer list with an optional name/phone search term. */
export class QueryCustomersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  // ?hasDebt=true keeps only customers who still owe money (debtBalance > 0).
  // Query strings arrive as "true"/"false"; @Transform coerces to a real boolean.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasDebt?: boolean;
}
