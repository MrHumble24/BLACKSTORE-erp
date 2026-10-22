import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

/** Categories and attributes feature (PRD FR-4). */
@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
