import { Workbook } from 'exceljs';

/** The subset of the investor report the spreadsheet needs (cost optional without view_cost). */
interface XlsxRow {
  investor: { name: string; isOwn: boolean };
  itemsSold: number;
  sales: string;
  cost?: string;
  profit: string;
  investorShare: string;
  businessShare: string;
}
interface XlsxReport {
  month: string;
  rows: XlsxRow[];
  totals: Omit<XlsxRow, 'investor'>;
}

/** Builds the investor report as an .xlsx workbook: one row per investor plus a totals row. */
export async function investorReportToXlsx(report: XlsxReport): Promise<Buffer> {
  const wb = new Workbook();
  const ws = wb.addWorksheet(`Investors ${report.month}`);
  ws.columns = [
    { header: 'Investor', key: 'investor', width: 24 },
    { header: 'Items sold', key: 'itemsSold', width: 12 },
    { header: 'Sales', key: 'sales', width: 14 },
    { header: 'Cost', key: 'cost', width: 14 },
    { header: 'Profit', key: 'profit', width: 14 },
    { header: 'Investor share', key: 'investorShare', width: 16 },
    { header: 'Business share', key: 'businessShare', width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const row of report.rows) {
    ws.addRow({ ...row, investor: row.investor.name + (row.investor.isOwn ? ' (own)' : ''), cost: row.cost ?? '' });
  }
  const totalRow = ws.addRow({ ...report.totals, investor: 'TOTAL', cost: report.totals.cost ?? '' });
  totalRow.font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
