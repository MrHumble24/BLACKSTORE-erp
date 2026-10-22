import { ItemStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** Filters for the paginated item list; ids arrive as query strings and are coerced. */
export class QueryItemsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

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
}
