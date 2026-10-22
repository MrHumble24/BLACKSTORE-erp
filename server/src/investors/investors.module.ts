import { Module } from '@nestjs/common';
import { InvestorTransactionsService } from './investor-transactions.service';
import { InvestorsController } from './investors.controller';
import { InvestorsService } from './investors.service';

/** Investors and their transactions feature (PRD FR-9, FR-10). */
@Module({
  controllers: [InvestorsController],
  providers: [InvestorsService, InvestorTransactionsService],
})
export class InvestorsModule {}
