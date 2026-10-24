import { Module } from '@nestjs/common';
import { InvestorTransactionsService } from './investor-transactions.service';
import { InvestorsController } from './investors.controller';
import { InvestorsService } from './investors.service';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

/** Investors and their transactions feature (PRD FR-9, FR-10). TelegramBotModule gives invite links (F23). */
@Module({
  imports: [TelegramBotModule],
  controllers: [InvestorsController],
  providers: [InvestorsService, InvestorTransactionsService],
})
export class InvestorsModule {}
