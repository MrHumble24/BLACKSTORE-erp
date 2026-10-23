import { Module } from '@nestjs/common';
import { ItemsModule } from '../items/items.module';
import { ConsignmentSellService } from './consignment-sell.service';
import { ConsignmentsController } from './consignments.controller';
import { ConsignmentsService } from './consignments.service';

/** Consignment feature (PRD F07, FR-26, W4). Reuses ItemsService.changeStatus for BR-9 moves. */
@Module({
  imports: [ItemsModule],
  controllers: [ConsignmentsController],
  providers: [ConsignmentsService, ConsignmentSellService],
})
export class ConsignmentsModule {}
