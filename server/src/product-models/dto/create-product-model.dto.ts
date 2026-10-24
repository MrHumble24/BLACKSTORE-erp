import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Fields to create a product model under a category. */
export class CreateProductModelDto {
  @IsInt()
  @Min(1)
  categoryId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  // Alert when stock reaches this (#7); 0 or null = no alerting. Admin-only route.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647) // Postgres Int ceiling; keeps it in range.
  lowStockThreshold?: number | null;
}
