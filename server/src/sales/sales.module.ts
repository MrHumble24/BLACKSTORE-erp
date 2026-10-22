import { Module } from '@nestjs/common';
import { ItemsModule } from '../items/items.module';
import { SalePaymentsService } from './sale-payments.service';
import { SaleReturnsService } from './sale-returns.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

/** Sales feature (PRD FR-19–FR-23). Reuses ItemsService.changeStatus for BR-9 item moves. */
@Module({
  imports: [ItemsModule],
  controllers: [SalesController],
  providers: [SalesService, SalePaymentsService, SaleReturnsService],
})
export class SalesModule {}
