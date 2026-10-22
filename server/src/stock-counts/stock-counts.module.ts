import { Module } from '@nestjs/common';
import { StockCountsController } from './stock-counts.controller';
import { StockCountsService } from './stock-counts.service';

/** Physical stock count feature (PRD FR-6, W7). */
@Module({
  controllers: [StockCountsController],
  providers: [StockCountsService],
})
export class StockCountsModule {}
