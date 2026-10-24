import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** The bot token to check against Telegram's `getMe` (not saved). */
export class VerifyTelegramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;
}
