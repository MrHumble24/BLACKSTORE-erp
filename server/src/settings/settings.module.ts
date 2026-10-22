import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/** Settings feature (PRD FR-24): the receipt header Admin edits. */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
