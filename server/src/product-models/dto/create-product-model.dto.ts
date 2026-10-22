import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

/** Fields to create a product model under a category. */
export class CreateProductModelDto {
  @IsInt()
  @Min(1)
  categoryId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
