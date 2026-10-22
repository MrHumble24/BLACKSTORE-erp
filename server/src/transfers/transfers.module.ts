import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

/** Stock transfers between locations (PRD FR-5, W6). */
@Module({
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
