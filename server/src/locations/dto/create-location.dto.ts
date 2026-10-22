import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LocationType } from '@prisma/client';

/** Fields to create a stock location (warehouse or shop). */
export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(LocationType)
  type!: LocationType;
}
