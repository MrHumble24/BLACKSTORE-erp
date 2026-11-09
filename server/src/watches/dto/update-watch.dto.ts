import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';
import { WATCH_CURRENCIES } from './create-watch.dto';

/** Only skip validation when the field is absent; null must still fail for non-nullable columns. */
const IfPresent = () => ValidateIf((_o: object, v: unknown) => v !== undefined);

/**
 * Editable watch fields (F34); every field optional. productModelId and maxPrice accept null to
 * clear them. No delete (BR-12): set isActive false instead.
 */
export class UpdateWatchDto {
  @IfPresent()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IfPresent()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(60, { each: true })
  aliases?: string[];

  @IsOptional()
  @IsInt()
  productModelId?: number | null;

  @IsOptional()
  @Matches(MONEY_REGEX, { message: 'maxPrice must be a decimal string' })
  maxPrice?: string | null;

  @IfPresent()
  @IsIn(WATCH_CURRENCIES)
  currency?: (typeof WATCH_CURRENCIES)[number];

  @IfPresent()
  @IsBoolean()
  isActive?: boolean;
}
