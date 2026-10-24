import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Fields that may be changed on a product model; category cannot change. */
export class UpdateProductModelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Alert threshold (#7); pass null to clear it, 0 or null = no alerting. Admin-only route.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647) // Postgres Int ceiling; keeps it in range.
  lowStockThreshold?: number | null;
}
