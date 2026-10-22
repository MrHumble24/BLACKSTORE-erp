import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ListQueryDto } from '../../common/list-query.dto';

/** Pick-list query: optional category filter, plus the shared ?all flag. */
export class QueryProductModelDto extends ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;
}
