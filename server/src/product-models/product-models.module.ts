import { Module } from '@nestjs/common';
import { ProductModelsController } from './product-models.controller';
import { ProductModelsService } from './product-models.service';

/** Product models feature (PRD FR-4). */
@Module({
  controllers: [ProductModelsController],
  providers: [ProductModelsService],
})
export class ProductModelsModule {}
