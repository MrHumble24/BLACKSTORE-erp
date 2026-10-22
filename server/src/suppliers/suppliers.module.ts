import { Module } from '@nestjs/common';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

/** Suppliers and their payments feature (PRD FR-14, FR-17). */
@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SupplierPaymentsService],
})
export class SuppliersModule {}
