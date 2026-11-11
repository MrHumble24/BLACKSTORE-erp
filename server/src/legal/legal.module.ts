import { Module } from '@nestjs/common';
import { LegalController } from './legal.controller';

/** Public Support and Privacy pages required for App Store submission (F35). */
@Module({
  controllers: [LegalController],
})
export class LegalModule {}
