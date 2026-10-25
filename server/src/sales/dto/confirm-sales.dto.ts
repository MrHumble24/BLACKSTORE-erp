import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Min } from 'class-validator';

/** Body of PATCH /sales/confirm (F33): the sales to confirm at once; duplicates are merged in the service. */
export class ConfirmSalesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids!: number[];
}
