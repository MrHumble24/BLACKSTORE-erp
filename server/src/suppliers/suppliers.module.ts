import { Module } from '@nestjs/common';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

/**
 * Suppliers and their payments feature (PRD FR-14, FR-17). Exports SupplierPaymentsService for the
 * investor "sent to suppliers" list (F25) and SuppliersService for "sends us devices" (F26); this module imports no modules, so InvestorsModule → here
 * cannot form a cycle.
 */
@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SupplierPaymentsService],
  exports: [SuppliersService, SupplierPaymentsService],
})
export class SuppliersModule {}
