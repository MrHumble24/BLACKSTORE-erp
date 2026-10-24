export const SCAN_CODE_REGEX = /^[A-Z0-9-]{4,40}$/i;
export const IMEI_REGEX = /^\d{15}$/;

export type ItemStatus =
  | 'IN_STOCK'
  | 'AT_PARTNER'
  | 'DEBT'
  | 'SOLD'
  | 'RETURNED'
  | 'DEFECTIVE';

export type ItemCondition = 'NEW' | 'USED' | 'REFURBISHED';

export type IdentifierType = 'IMEI' | 'SERIAL' | 'SYSTEM_CODE';

export interface ItemIdentifier {
  id: number;
  type: IdentifierType;
  value: string;
}

/** Minimal item projection returned by transfers, stock counts and the audit log. */
export interface ItemBrief {
  id: number;
  identifiers: ItemIdentifier[];
  productModel: { id: number; name: string };
  status: ItemStatus;
  location: { id: number; name: string };
}

export interface Item {
  id: number;
  productModel: {
    id: number;
    name: string;
    category: {
      id: number;
      name: string;
    };
  };
  investor: {
    id: number;
    name: string;
    code: string;
    isOwn: boolean;
  };
  location: {
    id: number;
    name: string;
    type: 'WAREHOUSE' | 'SHOP';
  };
  status: ItemStatus;
  condition: ItemCondition;
  attributes: Record<string, string | number>;
  salePrice: string | null;
  minSalePrice: string | null;
  identifiers: ItemIdentifier[];
  purchasePrice?: string;
  extraCost?: string;
  cost?: string;
  createdAt: string;
  updatedAt: string;
}

export type ItemWithCost = Item & {
  purchasePrice: string;
  extraCost: string;
  cost: string;
};

export interface CreateItemPayload {
  productModelId: number;
  investorId: number;
  locationId: number;
  condition?: ItemCondition;
  attributes?: Record<string, string | number>;
  identifiers: { type: IdentifierType; value: string }[];
  purchasePrice?: string;
  salePrice?: string;
  minSalePrice?: string;
}

export interface UpdateItemPayload {
  condition?: ItemCondition;
  attributes?: Record<string, string | number>;
}

export interface UpdatePricesPayload {
  purchasePrice?: string;
  salePrice?: string;
  minSalePrice?: string;
}

export interface AddIdentifierPayload {
  type: IdentifierType;
  value: string;
}

export type ItemSortBy =
  | 'createdAt'
  | 'model'
  | 'salePrice'
  | 'minSalePrice'
  | 'cost'
  | 'status';

export type SortOrder = 'asc' | 'desc';

export interface ItemFilters {
  status?: ItemStatus;
  condition?: ItemCondition;
  locationId?: number;
  categoryId?: number;
  investorId?: number;
  search?: string;
  isUnpriced?: boolean;
  sortBy?: ItemSortBy;
  sortOrder?: SortOrder;
}

export type { Page } from '@/shared/types';
