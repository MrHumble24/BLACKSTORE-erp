import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AccessoryStockController } from './accessory-stock.controller';
import { AccessoryStockService } from './accessory-stock.service';
import { LowStockAlertsService } from './low-stock-alerts.service';

/** Accessory stock feature (PRD FR-4), plus the daily low-stock alert digest (#7). */
@Module({
  imports: [IntegrationsModule],
  controllers: [AccessoryStockController],
  providers: [AccessoryStockService, LowStockAlertsService],
  exports: [AccessoryStockService], // BatchesModule adds accessories through this service.
})
export class AccessoryStockModule {}
