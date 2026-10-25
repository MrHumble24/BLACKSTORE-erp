import { Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { buildLowStockDigest, lowStockLines } from '../accessory-stock/low-stock';
import { startOfToday } from '../common/dates';
import { buildDebtReminderText } from '../customer-notifications/customer-messages';
import { deviceName, warrantyItemSelect } from '../customer-notifications/warranty-select';
import { buildInvestorReportText, investorReportData } from '../investor-notifications/investor-messages';
import { PrismaService } from '../prisma/prisma.service';
import { InvestorReportService } from '../reports/investor-report.service';
import { debtSaleSelect, totalDebt } from '../sales/sale-totals';
import { SettingsService } from '../settings/settings.service';
import {
  buildDebtorsText,
  buildNoActivityText,
  buildNoDebtText,
  buildWarrantyListText,
  DebtorLine,
} from './bot-messages';

/** Telegram caps a message at 4096 chars; 20 devices (uz + ru line each) stays well under it. */
const WARRANTY_LIST_LIMIT = 20;

const ZERO = new Prisma.Decimal(0);

/**
 * The text behind each bot button (F22). Every method returns a ready HTML message. Customer and
 * investor methods read only rows filtered by that person's own id; balances are computed from
 * sales, payments and returns (BR-8), never stored.
 */
@Injectable()
export class BotReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly investorReport: InvestorReportService,
  ) {}

  /** Owner: the same low-stock list as the daily digest, or "nothing low". */
  async lowStock(): Promise<string> {
    return buildLowStockDigest(await lowStockLines(this.prisma)) ?? "✅ Kam qolgan tovar yo'q";
  }

  /** Owner: every customer with outstanding debt (summed over their DEBT sales), biggest first. */
  async debtors(): Promise<string> {
    // ponytail: one message (~4000 char clamp in safeSend); add paging/split only if a shop ever exceeds it.
    const sales = await this.prisma.sale.findMany({
      where: { status: SaleStatus.DEBT, customerId: { not: null } },
      select: { customer: { select: { id: true, name: true } }, ...debtSaleSelect },
    });
    const byCustomer = new Map<number, { name: string; sales: typeof sales }>();
    for (const s of sales) {
      if (!s.customer) continue;
      const acc = byCustomer.get(s.customer.id) ?? { name: s.customer.name, sales: [] };
      acc.sales.push(s);
      byCustomer.set(s.customer.id, acc);
    }
    const owing = [...byCustomer.values()]
      .map((d) => ({ name: d.name, owed: totalDebt(d.sales) }))
      .filter((d) => d.owed.gt(0));
    owing.sort((a, b) => b.owed.comparedTo(a.owed));
    const total = owing.reduce((sum, d) => sum.plus(d.owed), ZERO);
    const lines: DebtorLine[] = owing.map((d) => ({ name: d.name, amount: d.owed.toFixed(2) }));
    return buildDebtorsText(lines, total.toFixed(2), owing.length);
  }

  /** Customer: their own total outstanding debt over every DEBT sale (returns already lower each balance). */
  async customerDebt(customerId: number): Promise<string> {
    const sales = await this.prisma.sale.findMany({
      where: { customerId, status: SaleStatus.DEBT },
      select: debtSaleSelect,
    });
    const owed = totalDebt(sales);
    const shop = await this.shopName();
    return owed.gt(0) ? buildDebtReminderText(shop, owed.toFixed(2)) : buildNoDebtText(shop);
  }

  /** Customer: their own devices still under warranty (not returned), newest sale first, capped. */
  async customerWarranty(customerId: number): Promise<string> {
    const rows = await this.prisma.saleItem.findMany({
      where: { sale: { customerId }, warrantyUntil: { gte: startOfToday() }, returns: { none: {} } },
      select: warrantyItemSelect,
      orderBy: { sale: { createdAt: 'desc' } },
      take: WARRANTY_LIST_LIMIT,
    });
    const items = rows.flatMap((r) => (r.warrantyUntil ? [{ device: deviceName(r), until: r.warrantyUntil }] : []));
    return buildWarrantyListText(await this.shopName(), items);
  }

  /** Investor: their own figures for `month` (YYYY-MM), never cost (canViewCost=false), or "no activity". */
  async investorMonth(investorId: number, investorName: string, month: string): Promise<string> {
    const report = await this.investorReport.report({ month, investorId }, false);
    const row = report.rows.find((r) => r.investor.id === investorId);
    if (!row) return buildNoActivityText(month);
    return buildInvestorReportText(investorReportData(month, investorName, row));
  }

  /** Shop name for customer texts, from the receipt settings (same source as the F17 reminders). */
  private async shopName(): Promise<string> {
    return (await this.settings.getReceipt()).shopName;
  }
}
