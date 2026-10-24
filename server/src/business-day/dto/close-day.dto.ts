import { FlagRefType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** One suspicious record the owner flags while closing the day (audited, FR-30). */
export class FlagInputDto {
  @IsEnum(FlagRefType)
  refType!: FlagRefType;

  @IsInt()
  @IsPositive()
  refId!: number;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

/** Close the current OPEN day: owner's counted drawer totals plus optional flags/note. */
export class CloseDayDto {
  // Counted cash in the drawer; variance against expected is computed server-side.
  @IsString()
  @Matches(MONEY_REGEX, { message: 'countedCash must be a decimal string' })
  countedCash!: string;

  @IsString()
  @Matches(MONEY_REGEX, { message: 'countedCard must be a decimal string' })
  countedCard!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FlagInputDto)
  flags?: FlagInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
