import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { SettingsService } from './settings.service';

/** HTTP for app settings (PRD FR-24). Reading the receipt header needs only a login. */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('receipt')
  getReceipt() {
    return this.settings.getReceipt();
  }

  @Patch('receipt')
  @Permissions('manage_catalog')
  updateReceipt(@Body() dto: UpdateReceiptDto, @CurrentUser() actor: PublicUser) {
    return this.settings.updateReceipt(dto, actor.id);
  }
}
