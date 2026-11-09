import { IsDefined, IsEnum, IsString, MaxLength, ValidateIf } from 'class-validator';
import { MatchStatus } from '@prisma/client';

/** New status for a match; the allowed moves are checked by MatchesService.changeStatus (BR-9). */
export class ChangeMatchStatusDto {
  @IsEnum(MatchStatus)
  status!: MatchStatus;
}

/** Free-text note on a match (F34); required so `{}` cannot wipe it. null or "" clears it. */
export class UpdateMatchDto {
  @ValidateIf((_, value) => value !== null)
  @IsDefined()
  @IsString()
  @MaxLength(500)
  note!: string | null;
}
