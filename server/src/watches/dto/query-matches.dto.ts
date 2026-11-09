import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MatchStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** Paginated match list with optional status and watch filters (F34). */
export class QueryMatchesDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  watchId?: number;
}
