import { Module } from '@nestjs/common';
import { ItemsImportController } from './import/items-import.controller';
import { ItemsImportService } from './import/items-import.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

/** Items feature (PRD F03) plus stock import (FR-7). Exports ItemsService for later features. */
@Module({
  controllers: [ItemsController, ItemsImportController],
  providers: [ItemsService, ItemsImportService],
  exports: [ItemsService],
})
export class ItemsModule {}
