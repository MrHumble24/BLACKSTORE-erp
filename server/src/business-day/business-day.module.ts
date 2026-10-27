import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { BusinessDayController } from './business-day.controller';
import { BusinessDayService } from './business-day.service';
import { DayCloseFlagsController } from './day-close-flags.controller';

/** Daily close / reconciliation (F13). Uses the global PrismaService and AuditService. */
@Module({
  imports: [IntegrationsModule],
  controllers: [BusinessDayController, DayCloseFlagsController],
  providers: [BusinessDayService],
  exports: [BusinessDayService],
})
export class BusinessDayModule {}

