import { Prisma } from '@prisma/client';
import { escapeHtml } from '../common/html';
import type { PrismaService } from '../prisma/prisma.service';

/** Stock-level filter values for the accessory-stock list (client has the same four). */
export const STOCK_LEVELS = ['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const;
export type StockLevel = (typeof STOCK_LEVELS)[number];

/** Rows that could be low: still in stock and whose model has an alert threshold set. */
export const LOW_CANDIDATE_WHERE: Prisma.AccessoryStockWhereInput = {
  quantity: { gt: 0 },
  productModel: { lowStockThreshold: { not: null } },
};

/** A row is low when it still has stock but is at or under its model's threshold (0/null = no alert). */
export function isLowStock(quantity: number, threshold: number | null): boolean {
  return quantity > 0 && threshold != null && quantity <= threshold;
}

/**
 * Ids of every low-stock row (business-wide), built on isLowStock so the list filter, the dashboard
 * count and the digest all agree. Narrowed to candidates in the query (few rows), judged in memory
 * because Prisma can't compare a row's quantity to its related model's threshold.
 */
export async function lowStockIds(prisma: PrismaService): Promise<number[]> {
  const rows = await prisma.accessoryStock.findMany({
    where: LOW_CANDIDATE_WHERE,
    select: { id: true, quantity: true, productModel: { select: { lowStockThreshold: true } } },
  });
  return rows.filter((r) => isLowStock(r.quantity, r.productModel.lowStockThreshold)).map((r) => r.id);
}

/** One low item, ready for the digest message. */
export interface LowStockLine {
  model: string;
  location: string;
  quantity: number;
  threshold: number;
}

/**
 * Low rows (model name, location name, quantity, threshold), ordered by model name. Shared by the
 * daily digest cron and the owner's "Kam qolgan tovarlar" bot button so both list the same items.
 */
export async function lowStockLines(prisma: PrismaService): Promise<LowStockLine[]> {
  const rows = await prisma.accessoryStock.findMany({
    where: LOW_CANDIDATE_WHERE,
    select: {
      quantity: true,
      productModel: { select: { name: true, lowStockThreshold: true } },
      location: { select: { name: true } },
    },
    orderBy: { productModel: { name: 'asc' } },
  });
  return rows
    .filter((r) => isLowStock(r.quantity, r.productModel.lowStockThreshold))
    .map((r) => ({
      model: r.productModel.name,
      location: r.location.name,
      quantity: r.quantity,
      threshold: r.productModel.lowStockThreshold ?? 0,
    }));
}

/**
 * One Telegram HTML message listing the low items, or null when there are none. Pure.
 * Model and location are free text, so they are HTML-escaped; a name like "AirPods & Case"
 * would otherwise make Telegram reject the whole message (400) and silently drop the digest.
 */
export function buildLowStockDigest(lines: LowStockLine[]): string | null {
  if (lines.length === 0) return null;
  const body = lines
    .map((l) => `• ${escapeHtml(l.model)} — ${escapeHtml(l.location)}: ${l.quantity}/${l.threshold}`)
    .join('\n');
  return `<b>Low stock — ${lines.length} item(s)</b>\n${body}`;
}
