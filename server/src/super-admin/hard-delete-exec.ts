import { Prisma } from '@prisma/client';
import { HardDeleteTargets } from './hard-delete-targets';

/**
 * Snapshot + delete half of hard delete. Both work off the frozen id sets in
 * {@link HardDeleteTargets}, so what we snapshot is exactly what we delete.
 */
type Db = Prisma.TransactionClient;

/** OR filter for the rows (purchase lines) keyed by item OR product model. */
function itemOrModel(itemIds: number[], productModelIds: number[]): Prisma.PurchaseLineWhereInput {
  return { OR: [{ itemId: { in: itemIds } }, { productModelId: { in: productModelIds } }] };
}

/**
 * Loads the FULL rows about to be destroyed (not counts) for the irreversible-delete
 * audit snapshot. Includes ItemIdentifier rows, which the DB would otherwise cascade
 * away silently when the items go.
 */
export async function snapshotRows(db: Db, t: HardDeleteTargets): Promise<Record<string, unknown>> {
  const { itemIds, productModelIds, saleIds, categoryId } = t;
  // Only the tables that actually have rows are queried and kept (absent key = nothing destroyed).
  const q: Record<string, Promise<unknown>> = {};
  if (saleIds.length) {
    const where = { saleId: { in: saleIds } };
    q.returns = db.return.findMany({ where });
    q.salePayments = db.salePayment.findMany({ where });
    q.saleItems = db.saleItem.findMany({ where });
    q.sales = db.sale.findMany({ where: { id: { in: saleIds } } });
  }
  if (itemIds.length) {
    const where = { itemId: { in: itemIds } };
    q.consignmentItems = db.consignmentItem.findMany({ where });
    q.transferItems = db.transferItem.findMany({ where });
    q.stockCountScans = db.stockCountScan.findMany({ where });
    q.itemIdentifiers = db.itemIdentifier.findMany({ where }); // cascade-deleted with items; captured here
    q.items = db.item.findMany({ where: { id: { in: itemIds } } });
  }
  if (productModelIds.length) {
    const where = { productModelId: { in: productModelIds } };
    q.transferAccessories = db.transferAccessory.findMany({ where });
    q.accessoryStock = db.accessoryStock.findMany({ where });
    q.productModels = db.productModel.findMany({ where: { id: { in: productModelIds } } });
  }
  if (itemIds.length || productModelIds.length) {
    q.purchaseLines = db.purchaseLine.findMany({ where: itemOrModel(itemIds, productModelIds) });
  }
  if (categoryId) {
    q.categoryAttributes = db.categoryAttribute.findMany({ where: { categoryId } });
    q.category = db.category.findUnique({ where: { id: categoryId } });
  }
  const keys = Object.keys(q);
  const values = await Promise.all(Object.values(q));
  const snapshot = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  // Trace the surviving items restocked by the delete (their sale vanishes); see deleteTargets.
  if (t.survivingItemIds.length) snapshot.restockedItemIds = t.survivingItemIds;
  return snapshot;
}

/**
 * Deletes children before parents (most FKs are onDelete: Restrict). Whole sales go in
 * full — every return, payment and line — never a single SaleItem (that would corrupt
 * another customer's BR-8 balance). Steps are sequential because the FK order matters.
 */
export async function deleteTargets(db: Db, t: HardDeleteTargets): Promise<void> {
  const { itemIds, productModelIds, saleIds, categoryId } = t;
  if (saleIds.length) {
    await db.return.deleteMany({ where: { saleId: { in: saleIds } } });
    await db.salePayment.deleteMany({ where: { saleId: { in: saleIds } } });
    await db.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
    await db.sale.deleteMany({ where: { id: { in: saleIds } } });
  }
  // Return surviving devices (on a deleted sale but not themselves deleted) to sellable stock.
  // Admin override: a direct set, deliberately bypassing the BR-9 Sold→InStock restriction,
  // because the sale that marked them SOLD/DEBT no longer exists.
  if (t.survivingItemIds.length) {
    await db.item.updateMany({ where: { id: { in: t.survivingItemIds } }, data: { status: 'IN_STOCK' } });
  }
  if (itemIds.length) {
    await db.consignmentItem.deleteMany({ where: { itemId: { in: itemIds } } });
    await db.transferItem.deleteMany({ where: { itemId: { in: itemIds } } });
  }
  if (productModelIds.length) {
    await db.transferAccessory.deleteMany({ where: { productModelId: { in: productModelIds } } });
  }
  if (itemIds.length || productModelIds.length) {
    await db.purchaseLine.deleteMany({ where: itemOrModel(itemIds, productModelIds) });
  }
  if (itemIds.length) {
    await db.stockCountScan.deleteMany({ where: { itemId: { in: itemIds } } });
  }
  if (productModelIds.length) {
    await db.accessoryStock.deleteMany({ where: { productModelId: { in: productModelIds } } });
  }
  // ItemIdentifier is onDelete: Cascade — deleting the items frees their IMEIs/serials at the DB
  // level, so a re-entered device won't trigger FR-25's "known IMEI" warning. Accepted.
  if (itemIds.length) {
    await db.item.deleteMany({ where: { id: { in: itemIds } } });
  }
  if (productModelIds.length) {
    await db.productModel.deleteMany({ where: { id: { in: productModelIds } } });
  }
  if (categoryId) {
    await db.categoryAttribute.deleteMany({ where: { categoryId } });
    await db.category.delete({ where: { id: categoryId } });
  }
}
