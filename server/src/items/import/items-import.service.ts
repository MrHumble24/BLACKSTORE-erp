import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type { PublicUser } from '../../common/auth-user';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateItemDto } from '../dto/create-item.dto';
import { attributeDefSelect } from '../item-validation';
import { ItemsService } from '../items.service';
import { buildTemplate } from './import-template';
import {
  parseRow,
  validateHeader,
  type ImportContext,
  type RawRow,
} from './import-row';

/** Upload cap; the controller's multer limit uses it too. */
export const MAX_BYTES = 5 * 1024 * 1024;
/** Most data rows one import may hold (keeps one request bounded). */
const MAX_ROWS = 5000;
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface ImportError {
  row: number;
  message: string;
}
export interface ImportResult {
  created: number;
  errors: ImportError[];
}

/** Stock import (FR-7): template download and row-by-row item creation from an .xlsx. */
@Injectable()
export class ItemsImportService {
  private readonly logger = new Logger(ItemsImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemsService,
  ) {}

  /** The downloadable .xlsx template. */
  template(): Promise<Buffer> {
    return buildTemplate();
  }

  /** Validates the file, then creates every valid row in its own transaction (FR-7). */
  async importFile(file: Express.Multer.File | undefined, actor: PublicUser): Promise<ImportResult> {
    assertXlsx(file);
    const ctx = await this.buildContext();
    const { headers, rows } = await readWorkbook(file.buffer);
    const headerError = validateHeader(headers, ctx.attributeKeys);
    if (headerError) return { created: 0, errors: [{ row: 1, message: headerError }] };

    const errors: ImportError[] = [];
    const seen = new Set<string>();
    let created = 0;
    for (const { excelRow, raw } of rows) {
      const parsed = parseRow(raw, ctx, seen);
      if (!parsed.ok) {
        errors.push({ row: excelRow, message: parsed.message });
        continue;
      }
      // ponytail: rows are created one by one (N transactions) so a bad row never blocks a good one; batch it if launch-day imports exceed a few thousand rows.
      // eslint-disable-next-line no-await-in-loop
      const result = await this.createRow(parsed.input as CreateItemDto, actor);
      if (result) errors.push({ row: excelRow, message: result });
      else created += 1;
    }
    return { created, errors };
  }

  /** Creates one item; returns an error message on failure, or null on success. */
  private async createRow(dto: CreateItemDto, actor: PublicUser): Promise<string | null> {
    try {
      await this.items.create(dto, actor, { auditAction: 'import' });
      return null;
    } catch (e) {
      // Only our own HTTP errors are safe to show; anything else is logged without row data.
      if (e instanceof HttpException) return e.message;
      this.logger.error(`Import row failed: ${e instanceof Error ? e.name : 'unknown error'}`);
      return 'Failed to create the item';
    }
  }

  /** Loads the master data the parser matches rows against. */
  private async buildContext(): Promise<ImportContext> {
    const [categories, investors, locations] = await Promise.all([
      this.prisma.category.findMany({
        select: {
          id: true, name: true, isSerialized: true,
          attributes: { select: attributeDefSelect },
          models: { select: { id: true, name: true } },
        },
      }),
      this.prisma.investor.findMany({ select: { id: true, code: true, isActive: true } }),
      this.prisma.location.findMany({ select: { id: true, name: true, isActive: true } }),
    ]);
    const attributeKeys = new Set<string>();
    const categoryMap: ImportContext['categories'] = new Map();
    for (const c of categories) {
      c.attributes.forEach((a) => attributeKeys.add(a.key.toLowerCase()));
      categoryMap.set(c.name.toLowerCase(), {
        id: c.id,
        isSerialized: c.isSerialized,
        attributes: c.attributes,
        models: new Map(c.models.map((m) => [m.name.toLowerCase(), m.id])),
      });
    }
    return {
      categories: categoryMap,
      investors: new Map(investors.map((i) => [i.code.toUpperCase(), { id: i.id, isActive: i.isActive }])),
      locations: new Map(locations.map((l) => [l.name.toLowerCase(), { id: l.id, isActive: l.isActive }])),
      attributeKeys,
    };
  }
}

/** 400 when the upload is missing or not an .xlsx (multer already enforces the size cap). */
function assertXlsx(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
  if (!file) throw new BadRequestException('A .xlsx file is required');
  const isXlsx = file.mimetype === XLSX_MIME || file.originalname?.toLowerCase().endsWith('.xlsx');
  if (!isXlsx) throw new BadRequestException('The file must be a .xlsx');
}

/** Reads the first worksheet into a header list and one RawRow per non-empty data row. */
async function readWorkbook(
  buffer: Buffer,
): Promise<{ headers: string[]; rows: { excelRow: number; raw: RawRow }[] }> {
  const workbook = new ExcelJS.Workbook();
  try {
    // Cast bridges @types/node's generic Buffer and exceljs's Buffer declaration (same bytes).
    await workbook.xlsx.load(buffer as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);
  } catch {
    throw new BadRequestException('The file is not a readable .xlsx');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('The workbook has no sheets');
  // rowCount counts the header row too.
  if (sheet.rowCount - 1 > MAX_ROWS) {
    throw new BadRequestException(`The sheet may hold at most ${MAX_ROWS} rows`);
  }

  const headerByCol: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    headerByCol[col] = String(cell.text).trim();
  });
  const headers = headerByCol.filter((h) => h && h.length > 0);

  const rows: { excelRow: number; raw: RawRow }[] = [];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const raw: RawRow = {};
    let hasValue = false;
    headerByCol.forEach((header, col) => {
      if (!header) return;
      const text = String(row.getCell(col).text).trim();
      raw[header.toLowerCase()] = text;
      if (text) hasValue = true;
    });
    if (hasValue) rows.push({ excelRow: r, raw });
  }
  return { headers, rows };
}
