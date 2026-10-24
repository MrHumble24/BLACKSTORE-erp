import { Module } from '@nestjs/common';
import { CustomerNotificationsModule } from '../customer-notifications/customer-notifications.module';
import { ItemsModule } from '../items/items.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { SalePaymentsService } from './sale-payments.service';
import { SaleReturnsService } from './sale-returns.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

/**
 * Sales feature (PRD FR-19–FR-23). Reuses ItemsService.changeStatus for BR-9 item moves.
 * Imports TelegramBotModule (LinkTokenService → the receipt invite link) and
 * CustomerNotificationsModule (fire the Telegram receipt after a sale, F17).
 */
@Module({
  imports: [ItemsModule, TelegramBotModule, CustomerNotificationsModule],
  controllers: [SalesController],
  providers: [SalesService, SalePaymentsService, SaleReturnsService],
})
export class SalesModule {}
