import { IsIn } from 'class-validator';
import { LANGUAGES } from '../../common/auth-user';
import type { Language } from '../../common/auth-user';

/** Logged-in user updating their own UI language. */
export class UpdateMeDto {
  @IsIn(LANGUAGES)
  language!: Language;
}
