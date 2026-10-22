import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

/** Customers feature (PRD FR-21). */
@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
