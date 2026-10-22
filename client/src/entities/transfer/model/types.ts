import type { ItemStatus, ItemIdentifier } from '@/entities/item';
import type { Page } from '@/shared/types';

export type { Page };

/** Minimal item projection returned by transfers, stock counts and the audit log. */
export interface ItemBrief {
  id: number;
  identifiers: ItemIdentifier[];
  productModel: { id: number; name: string };
  status: ItemStatus;
  location: { id: number; name: string };
}

interface NamedRef {
  id: number;
  name: string;
}

export interface TransferSummary {
  id: number;
  date: string;
  fromLocation: NamedRef;
  toLocation: NamedRef;
  user: NamedRef;
  itemCount: number;
  accessoryUnits: number;
  note: string | null;
}

export interface TransferAccessory {
  productModel: NamedRef;
  quantity: number;
}

export type Transfer = TransferSummary & {
  items: ItemBrief[];
  accessories: TransferAccessory[];
};

export interface TransferFilters {
  locationId?: number;
  itemId?: number;
  from?: string;
  to?: string;
}

export interface CreateTransferPayload {
  fromLocationId: number;
  toLocationId: number;
  itemIds?: number[];
  accessories?: { productModelId: number; quantity: number }[];
  note?: string;
}
