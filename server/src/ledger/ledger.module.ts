import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';

/** Manual income/expense ledger (PRD FR-27). */
@Module({
  controllers: [LedgerController],
  providers: [LedgerService],
})
export class LedgerModule {}
