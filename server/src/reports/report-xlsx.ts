import { Workbook } from 'exceljs';

// ── Profit report workbook (Totals sheet + non-paginated Lines sheet) ──

/** Profit totals as strings; `cost` absent without view_cost. */
interface ProfitTotalsXlsx {
  sales: string;
  refunded: string;
  cost?: string;
  profit: string;
  investorShare: string;
  businessShare: string;
  expenses: string;
  otherIncome: string;
  netProfit: string;
}

/** One mapped report line; `cost` absent without view_cost. */
interface ProfitLineXlsx {
  profitDate: string;
  kind: string;
  saleId: number;
  item: { code: string } | null;
  productModel: string;
  quantity: number;
  salePrice: string;
  refunded: string;
  cost?: string;
  profit: string;
  investorShare: string;
  businessShare: string;
  investor: { name: string } | null;
  location: { name: string };
  category: { name: string };
}

interface ProfitXlsxReport {
  totals: ProfitTotalsXlsx;
  lines: ProfitLineXlsx[];
  canViewCost: boolean;
}

/** Builds the profit report as an .xlsx workbook: a Totals sheet and a full Lines sheet. */
export async function profitReportToXlsx(report: ProfitXlsxReport): Promise<Buffer> {
  const wb = new Workbook();
  addProfitTotalsSheet(wb, report.totals, report.canViewCost);
  addProfitLinesSheet(wb, report.lines, report.canViewCost);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Metric/amount rows for the headline figures; the Cost row is dropped without view_cost. */
function addProfitTotalsSheet(wb: Workbook, t: ProfitTotalsXlsx, canViewCost: boolean): void {
  const ws = wb.addWorksheet('Totals');
  ws.columns = [
    { header: 'Metric', key: 'metric', width: 18 },
    { header: 'Amount', key: 'amount', width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  const rows: [string, string | undefined][] = [
    ['Sales', t.sales],
    ['Refunded', t.refunded],
    ...(canViewCost ? ([['Cost', t.cost]] as [string, string | undefined][]) : []),
    ['Profit', t.profit],
    ['Investor share', t.investorShare],
    ['Business share', t.businessShare],
    ['Expenses', t.expenses],
    ['Other income', t.otherIncome],
    ['Net profit', t.netProfit],
  ];
  for (const [metric, amount] of rows) ws.addRow({ metric, amount: amount ?? '' });
}

/** One row per report line; the Cost column is dropped without view_cost. */
function addProfitLinesSheet(wb: Workbook, lines: ProfitLineXlsx[], canViewCost: boolean): void {
  const ws = wb.addWorksheet('Lines');
  ws.columns = [
    { header: 'Date', key: 'date', width: 22 },
    { header: 'Kind', key: 'kind', width: 8 },
    { header: 'Sale', key: 'saleId', width: 8 },
    { header: 'Code', key: 'code', width: 14 },
    { header: 'Model', key: 'model', width: 18 },
    { header: 'Qty', key: 'quantity', width: 6 },
    { header: 'Sale price', key: 'salePrice', width: 14 },
    { header: 'Refunded', key: 'refunded', width: 12 },
    ...(canViewCost ? [{ header: 'Cost', key: 'cost', width: 12 }] : []),
    { header: 'Profit', key: 'profit', width: 12 },
    { header: 'Investor share', key: 'investorShare', width: 14 },
    { header: 'Business share', key: 'businessShare', width: 14 },
    { header: 'Investor', key: 'investor', width: 16 },
    { header: 'Location', key: 'location', width: 14 },
    { header: 'Category', key: 'category', width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const l of lines) {
    ws.addRow({
      date: l.profitDate,
      kind: l.kind,
      saleId: l.saleId,
      code: l.item?.code ?? '',
      model: l.productModel,
      quantity: l.quantity,
      salePrice: l.salePrice,
      refunded: l.refunded,
      cost: l.cost ?? '',
      profit: l.profit,
      investorShare: l.investorShare,
      businessShare: l.businessShare,
      investor: l.investor?.name ?? '',
      location: l.location.name,
      category: l.category.name,
    });
  }
}

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
