import { IsInt, Min } from 'class-validator';

/** Start a stock count for one location. */
export class CreateStockCountDto {
  @IsInt()
  @Min(1)
  locationId!: number;
}
