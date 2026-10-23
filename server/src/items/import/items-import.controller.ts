import {
  Controller,
  Get,
  HttpCode,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { PublicUser } from '../../common/auth-user';
import { CurrentUser, Permissions } from '../../common/decorators';
import { ItemsImportService, MAX_BYTES, XLSX_MIME } from './items-import.service';

/** Stock import endpoints (FR-7): template download and spreadsheet upload. */
@Controller('items/import')
export class ItemsImportController {
  constructor(private readonly importer: ItemsImportService) {}

  @Get('template')
  @Permissions('manage_prices')
  async template(): Promise<StreamableFile> {
    const buffer = await this.importer.template();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="stock-import-template.xlsx"',
    });
  }

  // 200 (not 201): the response is a result summary, not a created resource.
  @Post()
  @Permissions('manage_prices')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  importItems(@UploadedFile() file: Express.Multer.File, @CurrentUser() actor: PublicUser) {
    return this.importer.importFile(file, actor);
  }
}
