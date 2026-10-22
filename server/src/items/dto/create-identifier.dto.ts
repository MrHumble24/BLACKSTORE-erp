import { IdentifierType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** One identifier to add to an item; value is normalized and format-checked in the service. */
export class CreateIdentifierDto {
  @IsEnum(IdentifierType)
  type!: IdentifierType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  value!: string;
}
