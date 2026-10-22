import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { AttributeType } from '@prisma/client';

/** Fields to add a dynamic attribute to a category. Items store values by key. */
export class CreateAttributeDto {
  // Lowercase snake_case, so stored item attribute values key cleanly.
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'key must be lowercase snake_case',
  })
  @MaxLength(50)
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @IsEnum(AttributeType)
  type!: AttributeType;

  // Required and non-empty for SELECT, must be empty otherwise (checked in the service).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean = false;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}
