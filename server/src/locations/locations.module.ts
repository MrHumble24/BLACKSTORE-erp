import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

/** Locations feature (PRD FR-3). */
@Module({
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
