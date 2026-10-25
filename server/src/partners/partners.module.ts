import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { PartnerTransactionsService } from './partner-transactions.service';
import { PartnersService } from './partners.service';

/** Partner shops feature (PRD F07, FR-26). */
@Module({
  controllers: [PartnersController],
  providers: [PartnersService, PartnerTransactionsService],
})
export class PartnersModule {}
