import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SettingsModule } from '../settings/settings.module';
import { CustomerNotificationsService } from './customer-notifications.service';

/**
 * Customer-facing Telegram messages (F17): receipt-on-sale + the debt/warranty reminder crons.
 * Imports IntegrationsModule (credentials + feature flags) and SettingsModule (shop name); exports
 * the service so SalesService can fire a receipt after a sale commits. Neither imported module
 * imports this one, so there is no cycle. ScheduleModule is already global (the crons run).
 */
@Module({
  imports: [IntegrationsModule, SettingsModule],
  providers: [CustomerNotificationsService],
  exports: [CustomerNotificationsService],
})
export class CustomerNotificationsModule {}
