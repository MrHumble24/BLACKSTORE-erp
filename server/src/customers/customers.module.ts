import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

/** Customers feature (PRD FR-21). TelegramBotModule provides LinkTokenService for invite links (F23). */
@Module({
  imports: [TelegramBotModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
