import { Module } from '@nestjs/common';
import { AccessoryStockModule } from '../accessory-stock/accessory-stock.module';
import { ItemsModule } from '../items/items.module';
import { BatchLinesService } from './batch-lines.service';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

/** Batches feature (PRD FR-16, FR-18). Reuses ItemsService and AccessoryStockService for lines. */
@Module({
  imports: [ItemsModule, AccessoryStockModule],
  controllers: [BatchesController],
  providers: [BatchesService, BatchLinesService],
})
export class BatchesModule {}
