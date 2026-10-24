import { Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { buildLowStockDigest, lowStockLines } from '../accessory-stock/low-stock';
import { startOfToday } from '../common/dates';
import { buildDebtReminderText } from '../customer-notifications/customer-messages';
import { deviceName, warrantyItemSelect } from '../customer-notifications/warranty-select';
import { buildInvestorReportText } from '../investor-notifications/investor-messages';
import { PrismaService } from '../prisma/prisma.service';
import { InvestorReportService } from '../reports/investor-report.service';
import { debtBalanceOf, debtSaleSelect } from '../sales/sale-totals';
import { SettingsService } from '../settings/settings.service';
import {
  buildDebtorsText,
  buildNoActivityText,
  buildNoDebtText,
  buildWarrantyListText,
  DebtorLine,
} from './bot-messages';

/** The owner's debtors list shows the biggest debts only; the total still covers everyone. */
const TOP_DEBTORS = 10;
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

  /** Owner: customers by outstanding debt (summed over their DEBT sales), biggest first, top 10. */
  async debtors(): Promise<string> {
    const sales = await this.prisma.sale.findMany({
      where: { status: SaleStatus.DEBT, customerId: { not: null } },
      select: { customerId: true, customer: { select: { name: true } }, ...debtSaleSelect },
    });
    const byCustomer = new Map<number, { name: string; owed: Prisma.Decimal }>();
    for (const s of sales) {
      if (!s.customerId || !s.customer) continue;
      const acc = byCustomer.get(s.customerId) ?? { name: s.customer.name, owed: ZERO };
      byCustomer.set(s.customerId, { ...acc, owed: acc.owed.plus(debtBalanceOf(s)) });
    }
    const owing = [...byCustomer.values()].filter((d) => d.owed.gt(0));
    owing.sort((a, b) => b.owed.comparedTo(a.owed));
    const total = owing.reduce((sum, d) => sum.plus(d.owed), ZERO);
    const top: DebtorLine[] = owing.slice(0, TOP_DEBTORS).map((d) => ({ name: d.name, amount: d.owed.toFixed(2) }));
    return buildDebtorsText(top, total.toFixed(2), owing.length);
  }

  /** Customer: their own total outstanding debt over every DEBT sale (returns already lower each balance). */
  async customerDebt(customerId: number): Promise<string> {
    const sales = await this.prisma.sale.findMany({
      where: { customerId, status: SaleStatus.DEBT },
      select: debtSaleSelect,
    });
    const owed = sales.reduce((sum, s) => sum.plus(debtBalanceOf(s)), ZERO);
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
    return buildInvestorReportText({
      month,
      investorName,
      sales: row.sales,
      profit: row.profit,
      share: row.investorShare,
    });
  }

  /** Shop name for customer texts, from the receipt settings (same source as the F17 reminders). */
  private async shopName(): Promise<string> {
    return (await this.settings.getReceipt()).shopName;
  }
}
