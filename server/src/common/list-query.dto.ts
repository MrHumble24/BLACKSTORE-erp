import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/** Shared query for reference lists: ?all=true shows inactive records too. */
export class ListQueryDto {
  // Query strings arrive as "true"/"false"; @Transform coerces to a real boolean.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  all: boolean = false;
}
