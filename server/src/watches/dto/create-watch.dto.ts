import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/** Currency labels a watch may carry (BR-11 exception: a label only, never converted). */
export const WATCH_CURRENCIES = ['USD', 'UZS'] as const;

/** Fields to create a watch (F34): a model name plus the aliases the Watcher matches against. */
export class CreateWatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(60, { each: true })
  aliases!: string[];

  @IsOptional()
  @IsInt()
  productModelId?: number;

  @IsOptional()
  @Matches(MONEY_REGEX, { message: 'maxPrice must be a decimal string' })
  maxPrice?: string;

  @IsOptional()
  @IsIn(WATCH_CURRENCIES)
  currency?: (typeof WATCH_CURRENCIES)[number];
}
