import type { ItemBrief } from '@/entities/item';

export type { ItemBrief };

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
