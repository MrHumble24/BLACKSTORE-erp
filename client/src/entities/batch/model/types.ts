import type {
  ItemStatus,
  ItemIdentifier,
  ItemCondition,
  IdentifierType,
} from '@/entities/item';

export type CostSplitMethod = 'NONE' | 'EQUAL' | 'BY_PRICE';

/** Batch row shown in list tables (cost keys appear only for view_cost users). */
export interface BatchSummary {
  id: number;
  supplier: { id: number; name: string };
  investor: { id: number; name: string; code: string; isOwn: boolean };
  location: { id: number; name: string };
  arrivalDate: string;
  note: string | null;
  deviceCount: number;
  accessoryUnits: number;
  costSplitMethod: CostSplitMethod;
  extraCostTotal?: string;
  itemsCost?: string;
}

/** One batch line: either a device (itemId set, quantity = 1) or an accessory line. */
export interface BatchLine {
  id: number;
  quantity: number;
  item: { id: number; status: ItemStatus; identifiers: ItemIdentifier[] } | null;
  productModel: { id: number; name: string; category: { id: number; name: string } };
  unitPrice?: string;
  extraCost?: string;
}

/** Full batch with its lines ordered by id (recieve_batch only). */
export interface Batch extends BatchSummary {
  lines: BatchLine[];
}

export interface BatchFilters {
  supplierId?: number;
}

export interface BatchItemIdentifier {
  type: IdentifierType;
  value: string;
}

export interface CreateBatchPayload {
  supplierId: number;
  investorId: number;
  locationId: number;
  arrivalDate?: string;
  note?: string;
}

/** extraCostTotal / costSplitMethod need manage_prices (403 otherwise). */
export interface UpdateBatchPayload {
  arrivalDate?: string;
  note?: string;
  extraCostTotal?: string;
  costSplitMethod?: CostSplitMethod;
}

/** purchasePrice needs manage_prices (403 if sent without it). */
export interface AddBatchItemPayload {
  productModelId: number;
  identifiers: BatchItemIdentifier[];
  condition?: ItemCondition;
  attributes?: Record<string, string | number>;
  purchasePrice?: string;
}

export interface AddBatchAccessoryPayload {
  productModelId: number;
  quantity: number;
  unitCost?: string;
}

export interface UpdateBatchLinePayload {
  unitPrice: string;
}
