import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Fields to create a product category. */
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  // Default true: most categories track individual serialized devices.
  @IsOptional()
  @IsBoolean()
  isSerialized?: boolean = true;
}
