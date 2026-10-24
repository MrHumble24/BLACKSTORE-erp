import { Body, Controller, Delete, Get, HttpCode, Patch, Put, Post } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { SaveTelegramDto, UpdateTelegramSettingsDto } from './dto/save-telegram.dto';
import { VerifyTelegramDto } from './dto/verify-telegram.dto';
import { TelegramConfigService } from './telegram-config.service';

/** Super-admin Telegram setup (F12); every route needs `manage_integrations`. Token never returned. */
@Controller('integrations/telegram')
@Permissions('manage_integrations')
export class IntegrationsController {
  constructor(private readonly telegram: TelegramConfigService) {}

  /** Current config (no token) plus feature flags. */
  @Get()
  getStatus() {
    return this.telegram.getStatus();
  }

  /** Recent chats for the UI picker. */
  @Get('chats')
  getChats() {
    return this.telegram.getChats();
  }

  /** "Is this bot yours?" — verify a token with Telegram without saving. */
  @Post('verify')
  @HttpCode(200)
  async verify(@Body() dto: VerifyTelegramDto) {
    return { ok: true, bot: await this.telegram.verify(dto.token) };
  }

  /** Connect/replace the bot: verify + save the token (encrypted), chat ids and feature flags. */
  @Put()
  save(@Body() dto: SaveTelegramDto, @CurrentUser() actor: PublicUser) {
    return this.telegram.save(dto, actor.id);
  }

  /** Everyday settings change (no token): toggles + chat ids; keeps the stored bot. */
  @Patch('settings')
  updateSettings(@Body() dto: UpdateTelegramSettingsDto, @CurrentUser() actor: PublicUser) {
    return this.telegram.updateSettings(dto, actor.id);
  }

  /** Clear the stored config (back to env fallback). */
  @Delete()
  @HttpCode(204)
  async clear(@CurrentUser() actor: PublicUser) {
    await this.telegram.clear(actor.id);
  }
}
