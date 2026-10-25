import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MONEY_REGEX } from '../../common/money';

/**
 * Admin correction of a CLOSED day (F28): only what the owner typed at close time.
 * Expected cash/card are a frozen close-time snapshot and are not editable here.
 */
export class UpdateBusinessDayDto {
  @IsOptional()
  @IsString()
  @Matches(MONEY_REGEX, { message: 'countedCash must be a decimal string' })
  countedCash?: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY_REGEX, { message: 'countedCard must be a decimal string' })
  countedCard?: string;

  // null is a real change: it clears the note.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
