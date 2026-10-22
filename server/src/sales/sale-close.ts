import { ItemStatus, Prisma } from '@prisma/client';
import { ItemsService } from '../items/items.service';

type Tx = Prisma.TransactionClient;

/**
 * Moves a closed debt sale's device items to SOLD, but only the ones still in DEBT.
 * Returned items (now RETURNED/DEFECTIVE/IN_STOCK) are skipped, so a return can no
 * longer be re-SOLD and a defective line can no longer block closing the debt (BR-9).
 * Shared by payments (last payment) and returns (a refund that zeroes the balance).
 */
export async function closeDebtItems(
  tx: Tx,
  items: ItemsService,
  saleItems: { itemId: number | null }[],
): Promise<void> {
  const ids = saleItems.map((i) => i.itemId).filter((id): id is number => id != null);
  if (ids.length === 0) return;
  const debtItems = await tx.item.findMany({
    where: { id: { in: ids }, status: ItemStatus.DEBT },
    select: { id: true },
  });
  for (const { id } of debtItems) {
    // eslint-disable-next-line no-await-in-loop -- sequential by design (single tx connection)
    await items.changeStatus(tx, id, ItemStatus.SOLD);
  }
}
