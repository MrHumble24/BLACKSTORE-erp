import { Module } from '@nestjs/common';
import { ItemsModule } from '../items/items.module';
import { WalkInPayoutsService } from './walk-in-payouts.service';
import { WalkInPurchasesController } from './walk-in-purchases.controller';
import { WalkInPurchasesService } from './walk-in-purchases.service';

/** Walk-in purchases feature (PRD FR-25, W5). Reuses ItemsService to receive the device; payouts confirmed in F32. */
@Module({
  imports: [ItemsModule],
  controllers: [WalkInPurchasesController],
  providers: [WalkInPurchasesService, WalkInPayoutsService],
})
export class WalkInPurchasesModule {}
