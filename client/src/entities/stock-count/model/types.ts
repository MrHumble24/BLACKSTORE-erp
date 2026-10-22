import type { ItemStatus, ItemIdentifier } from '@/entities/item';
import type { Page } from '@/shared/types';

export type { Page };

/** Minimal item projection returned inside scans and results. */
export interface ItemBrief {
  id: number;
  identifiers: ItemIdentifier[];
  productModel: { id: number; name: string };
  status: ItemStatus;
  location: { id: number; name: string };
}

export type ScanStatus = 'FOUND' | 'UNKNOWN' | 'WRONG_LOCATION' | 'DUPLICATE';

export interface StockCountScan {
  id: number;
  code: string;
  status: ScanStatus;
  item: ItemBrief | null;
  scannedAt: string;
}

export interface StockCountSummary {
  id: number;
  location: { id: number; name: string };
  user: { id: number; name: string };
  startedAt: string;
  finishedAt: string | null;
  scannedCount: number;
}

export type StockCount = StockCountSummary & {
  result: {
    expectedCount: number;
    found: number;
    missing: ItemBrief[];
    wrongLocation: ItemBrief[];
    unknown: { code: string; scannedAt: string }[];
  };
};

export interface StockCountFilters {
  locationId?: number;
}

export interface CreateStockCountPayload {
  locationId: number;
}
