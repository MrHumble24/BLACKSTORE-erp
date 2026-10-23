import type { ItemBrief } from '@/entities/item';

export type ConsignmentItemStatus = 'AT_PARTNER' | 'SOLD' | 'RETURNED';

/** Single line item in a consignment record. */
export interface ConsignmentItem {
  id: number;
  item: ItemBrief;
  minPrice: string;
  status: ConsignmentItemStatus;
  soldAt: string | null;
  saleId: number | null;
  returnedAt: string | null;
  overdue: boolean;
}

/** Summary projection of a consignment for list views. */
export interface ConsignmentSummary {
  id: number;
  date: string;
  partner: { id: number; name: string };
  handedBy: { id: number; name: string };
  dueDate: string | null;
  note: string | null;
  itemCount: number;
  heldCount: number;
}

/** Full consignment detail including items list. */
export interface Consignment extends ConsignmentSummary {
  items: ConsignmentItem[];
}

export interface ConsignmentFilters {
  partnerId?: number;
  open?: boolean;
}

export interface CreateConsignmentItemPayload {
  itemId: number;
  minPrice: string;
}

export interface CreateConsignmentPayload {
  partnerId: number;
  items: CreateConsignmentItemPayload[];
  dueDate?: string;
  note?: string;
}

export interface SellConsignmentItemPayload {
  paid: boolean;
  method?: 'CASH' | 'CARD';
}
