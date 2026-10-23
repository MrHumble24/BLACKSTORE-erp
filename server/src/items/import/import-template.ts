import * as ExcelJS from 'exceljs';
import { FIXED_COLUMNS } from './import-row';

/** One example row so the user sees the expected shape (attribute columns are added by hand). */
const EXAMPLE_ROW: Record<string, string> = {
  category: 'iPhone',
  model: 'iPhone 15 Pro',
  identifier: '350000000000001',
  owner_code: 'OWN',
  location: 'Sklad',
  condition: 'NEW',
  purchase_price: '1000',
  sale_price: '1200',
  min_sale_price: '1150',
};

/**
 * Builds the stock-import template workbook: one header row plus one example row (FR-7).
 * Category attribute columns are appended by the user after the fixed columns.
 */
export async function buildTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('items');
  sheet.columns = FIXED_COLUMNS.map((key) => ({ header: key, key, width: 16 }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow(EXAMPLE_ROW);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
