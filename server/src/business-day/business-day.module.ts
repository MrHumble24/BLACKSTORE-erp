import { Module } from '@nestjs/common';
import { BusinessDayController } from './business-day.controller';
import { BusinessDayService } from './business-day.service';
import { DayCloseFlagsController } from './day-close-flags.controller';

/** Daily close / reconciliation (F13). Uses the global PrismaService and AuditService. */
@Module({
  controllers: [BusinessDayController, DayCloseFlagsController],
  providers: [BusinessDayService],
})
export class BusinessDayModule {}
