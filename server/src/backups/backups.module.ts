import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

/** Backups feature (FR-31): encrypted dumps, listing, manual run, cron and restore. */
@Module({
  imports: [IntegrationsModule],
  controllers: [BackupsController],
  providers: [BackupsService],
  exports: [BackupsService], // F12 super-admin takes a fresh backup before a hard delete
})
export class BackupsModule {}
