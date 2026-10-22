import { ItemStatus } from '@prisma/client';
import type { ItemBrief } from '../common/item-brief';

export type ScanStatus = 'FOUND' | 'UNKNOWN' | 'WRONG_LOCATION' | 'DUPLICATE';

/** A scan reduced to what the result needs: the resolved item (if any) and when it was scanned. */
export interface ScanWithItem {
  scannedCode: string;
  scannedAt: Date;
  item: ItemBrief | null;
}

/**
 * Classifies a single scan against the count's location:
 * no item → UNKNOWN; in stock here → FOUND; anywhere else or not in stock → WRONG_LOCATION.
 */
export function classifyScan(item: ItemBrief | null, locationId: number): Exclude<ScanStatus, 'DUPLICATE'> {
  if (!item) return 'UNKNOWN';
  if (item.status === ItemStatus.IN_STOCK && item.location.id === locationId) return 'FOUND';
  return 'WRONG_LOCATION';
}

/**
 * Derives the count result from the CURRENT expected set and the stored scans (FR-6).
 * expected = items IN_STOCK at the location now; missing = expected not scanned;
 * wrongLocation = scanned items not expected here; unknown = scans with no item.
 * Pure so a finished count re-reads consistently from whatever it is given.
 */
// ponytail: scan status is not stored (no column); derived on each read, so a finished count can drift. Add a status column if history must be frozen.
export function computeResult(expected: ItemBrief[], scans: ScanWithItem[]) {
  const scannedItemIds = new Set(scans.flatMap((s) => (s.item ? [s.item.id] : [])));
  const expectedIds = new Set(expected.map((e) => e.id));
  const missing = expected.filter((e) => !scannedItemIds.has(e.id));

  const seen = new Set<number>();
  const wrongLocation: ItemBrief[] = [];
  for (const scan of scans) {
    if (scan.item && !expectedIds.has(scan.item.id) && !seen.has(scan.item.id)) {
      seen.add(scan.item.id);
      wrongLocation.push(scan.item);
    }
  }
  const unknown = scans
    .filter((s) => !s.item)
    .map((s) => ({ code: s.scannedCode, scannedAt: s.scannedAt }));

  return {
    expectedCount: expected.length,
    found: expected.length - missing.length,
    missing,
    wrongLocation,
    unknown,
  };
}
