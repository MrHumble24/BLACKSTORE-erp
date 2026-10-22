import { IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Open a supplier batch; items and accessories land at its location (FR-8). */
export class CreateBatchDto {
  @IsInt()
  @Min(1)
  supplierId!: number;

  @IsInt()
  @Min(1)
  investorId!: number;

  @IsInt()
  @Min(1)
  locationId!: number;

  @IsOptional()
  @IsISO8601()
  arrivalDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
