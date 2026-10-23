import { Module } from '@nestjs/common';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

/** Backups feature (FR-31): encrypted dumps, listing, manual run, cron and restore. */
@Module({
  controllers: [BackupsController],
  providers: [BackupsService],
})
export class BackupsModule {}
