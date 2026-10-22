import { Module } from '@nestjs/common';
import { AccessoryStockController } from './accessory-stock.controller';
import { AccessoryStockService } from './accessory-stock.service';

/** Accessory stock feature (PRD FR-4). */
@Module({
  controllers: [AccessoryStockController],
  providers: [AccessoryStockService],
  exports: [AccessoryStockService], // BatchesModule adds accessories through this service.
})
export class AccessoryStockModule {}
