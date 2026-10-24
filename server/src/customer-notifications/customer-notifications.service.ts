import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, SaleStatus } from '@prisma/client';
import { sendMessage } from '../common/telegram';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { debtBalanceOf, debtSaleSelect, sumPaid } from '../sales/sale-totals';
import type { SaleDetailRow } from '../sales/sale-shape';
import {
  buildDebtReminderText,
  buildReceiptText,
  buildWarrantyReminderText,
  ReceiptLine,
  WarrantyItem,
} from './customer-messages';

/** Monday 10:00 server-local — weekly, not daily, so debtors are nudged once, not nagged. */
const DEBT_CRON = '0 10 * * 1';
/** 09:00 server-local daily; see remindWarranties for why a daily exact-day run needs no dedupe column. */
const WARRANTY_CRON = '0 9 * * *';
/** Days before expiry we message a warranty: each item is reminded at most twice (7-day and 1-day). */
const WARRANTY_DAYS = [7, 1];

/**
 * Customer-facing Telegram messages (F17): a receipt after each sale, a weekly debt reminder and a
 * warranty-expiry reminder. Every path is gated on its own feature flag (default OFF) and only ever
 * messages a customer who has opted in (`telegramChatId` set via /start). Nothing here throws out of
 * a cron or out of a sale — a Telegram failure is logged and swallowed.
 */
@Injectable()
export class CustomerNotificationsService {
  private readonly logger = new Logger(CustomerNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramConfigService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Fire-and-forget receipt for a just-created sale. Sends only when the sale has a linked customer
   * AND the customerReceipts flag is on. Never throws: a Telegram error must not fail the sale.
   */
  async sendSaleReceipt(sale: SaleDetailRow): Promise<void> {
    try {
      const chatId = sale.customer?.telegramChatId;
      if (!chatId) return; // walk-in or not linked → nothing to send
      if (!(await this.telegram.isFeatureEnabled('customerReceipts'))) return;
      const { token } = await this.telegram.getCredentials();
      if (!token) return;
      const text = buildReceiptText({
        shopName: await this.shopName(),
        date: sale.createdAt,
        lines: sale.items.map(toReceiptLine),
        total: sale.total.toFixed(2),
        paid: sumPaid(sale.payments).toFixed(2),
        balance: debtBalanceOf(sale).toFixed(2),
      });
      if (!(await sendMessage(token, chatId, text))) {
        this.logger.warn(`Receipt for sale #${sale.id} failed to send`);
      }
    } catch (e) {
      this.logger.warn(`Receipt for sale #${sale.id} errored: ${msg(e)}`);
    }
  }

  /** Weekly: one reminder per linked customer whose outstanding debt (BR-8) is still above zero. */
  @Cron(DEBT_CRON)
  async remindDebts(): Promise<void> {
    try {
      if (!(await this.telegram.isFeatureEnabled('debtReminders'))) return;
      const token = await this.tokenOrSkip();
      if (!token) return;
      const shop = await this.shopName();
      const customers = await this.prisma.customer.findMany({
        where: { telegramChatId: { not: null }, sales: { some: { status: SaleStatus.DEBT } } },
        select: {
          telegramChatId: true,
          sales: { where: { status: SaleStatus.DEBT }, select: debtSaleSelect },
        },
      });
      for (const c of customers) {
        const owed = c.sales.reduce((sum, s) => sum.plus(debtBalanceOf(s)), new Prisma.Decimal(0));
        if (!c.telegramChatId || !owed.isPositive()) continue;
        // eslint-disable-next-line no-await-in-loop -- sequential sends; one failure must not stop the rest
        await this.safeSend(token, c.telegramChatId, buildDebtReminderText(shop, owed.toFixed(2)));
      }
    } catch (e) {
      this.logger.error(`Debt reminder cron failed: ${msg(e)}`);
    }
  }

  /**
   * Daily: remind each linked customer whose warranty ends in exactly 7 or 1 days. "Exactly N days"
   * (not "within 7 days") means each item is messaged at most twice and never repeats on later runs,
   * so no "reminded" dedupe column is needed — a restart only risks re-sending if it happens to run
   * twice on the same calendar day, which is an acceptable v1 ceiling. Returned items are excluded
   * (`returns: none`) so we never remind about a device the customer gave back. Items are grouped by
   * chat so a customer with several expiring devices gets one message, not one per device.
   */
  @Cron(WARRANTY_CRON)
  async remindWarranties(): Promise<void> {
    try {
      if (!(await this.telegram.isFeatureEnabled('warrantyReminders'))) return;
      const token = await this.tokenOrSkip();
      if (!token) return;
      const shop = await this.shopName();
      const items = await this.prisma.saleItem.findMany({
        where: {
          OR: WARRANTY_DAYS.map((d) => ({ warrantyUntil: dayWindow(d) })),
          returns: { none: {} }, // a returned line is still within the window but must not be reminded
          sale: { customer: { telegramChatId: { not: null } } },
        },
        select: {
          warrantyUntil: true,
          productModel: { select: { name: true } },
          item: { select: { identifiers: { select: { value: true }, take: 1 } } },
          sale: { select: { customer: { select: { telegramChatId: true } } } },
        },
      });
      const byChat = new Map<string, WarrantyItem[]>();
      for (const it of items) {
        const chatId = it.sale.customer?.telegramChatId;
        if (!chatId || !it.warrantyUntil) continue;
        const list = byChat.get(chatId) ?? [];
        list.push({ device: deviceName(it), until: it.warrantyUntil });
        byChat.set(chatId, list);
      }
      for (const [chatId, list] of byChat) {
        // eslint-disable-next-line no-await-in-loop -- sequential sends; one failure must not stop the rest
        await this.safeSend(token, chatId, buildWarrantyReminderText(shop, list));
      }
    } catch (e) {
      this.logger.error(`Warranty reminder cron failed: ${msg(e)}`);
    }
  }

  /** Current shop name for the message header ('' until an Admin sets the receipt). */
  private async shopName(): Promise<string> {
    return (await this.settings.getReceipt()).shopName;
  }

  /** Resolved bot token, or '' (warn) when Telegram is not configured — the cron then skips. */
  private async tokenOrSkip(): Promise<string> {
    const { token } = await this.telegram.getCredentials();
    if (!token) this.logger.warn('Telegram not configured; skipping customer reminder cron');
    return token;
  }

  /** Sends one message, logging (never throwing) on a failure so the loop continues. */
  private async safeSend(token: string, chatId: string, text: string): Promise<void> {
    try {
      if (!(await sendMessage(token, chatId, text))) this.logger.warn('Customer reminder failed to send');
    } catch (e) {
      this.logger.warn(`Customer reminder errored: ${msg(e)}`);
    }
  }
}

/** A half-open day window [midnight+days, midnight+days+1) in server-local time for an exact-day match. */
function dayWindow(days: number): { gte: Date; lt: Date } {
  const gte = new Date();
  gte.setHours(0, 0, 0, 0);
  gte.setDate(gte.getDate() + days);
  const lt = new Date(gte);
  lt.setDate(lt.getDate() + 1);
  return { gte, lt };
}

/** Receipt line from a sale item: accessory model name, else the device identifier, else generic. */
function toReceiptLine(item: SaleDetailRow['items'][number]): ReceiptLine {
  return { model: deviceName(item), quantity: item.quantity, unitPrice: item.unitPrice.toFixed(2) };
}

/** Human label for a sale item: accessory model name, else the first device identifier, else a generic. */
function deviceName(item: {
  productModel: { name: string } | null;
  item: { identifiers: { value: string }[] } | null;
}): string {
  return item.productModel?.name ?? item.item?.identifiers[0]?.value ?? 'Mahsulot';
}

/** Error message text for a log line. */
function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
