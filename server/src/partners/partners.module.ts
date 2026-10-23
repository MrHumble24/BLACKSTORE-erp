import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

/** Partner shops feature (PRD F07, FR-26). */
@Module({
  controllers: [PartnersController],
  providers: [PartnersService],
})
export class PartnersModule {}
