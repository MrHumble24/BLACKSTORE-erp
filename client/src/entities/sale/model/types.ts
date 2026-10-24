import type { ItemIdentifier, ItemStatus } from '@/entities/item';

export type PaymentMethod = 'CASH' | 'CARD';
export type SaleStatus = 'DEBT' | 'PAID' | 'RETURNED';

export interface SaleItem {
  id: number;
  item: { id: number; identifiers: ItemIdentifier[]; status: ItemStatus } | null;
  productModel: { id: number; name: string; category: { id: number; name: string } };
  quantity: number;
  unitPrice: string;
  warrantyUntil: string | null;
  returnedQuantity: number;
  unitCost?: string;
  investor?: { id: number; name: string; code: string } | null;
  shareType?: 'NONE' | 'PERCENT' | 'FIXED';
  shareValue?: string;
}

export interface SalePayment {
  id: number;
  amount: string;
  method: PaymentMethod;
  date: string;
  receivedBy: { id: number; name: string };
}

export interface SaleReturn {
  id: number;
  saleItemId: number;
  quantity: number;
  refundAmount: string;
  result: 'BACK_TO_STOCK' | 'DEFECTIVE';
  reason: string | null;
  date: string;
  user: { id: number; name: string };
}

export interface SaleSummary {
  id: number;
  createdAt: string;
  status: SaleStatus;
  customer: { id: number; name: string; phone: string } | null;
  location: { id: number; name: string };
  seller: { id: number; name: string };
  total: string;
  paid: string;
  refunded: string;
  balance: string;
  dueDate: string | null;
  itemCount: number;
}

export interface Sale extends SaleSummary {
  /** One-time bot invite link for the customer; null for walk-ins, linked customers or no bot. */
  telegramInviteLink: string | null;
  items: SaleItem[];
  payments: SalePayment[];
  returns: SaleReturn[];
}

export interface CreateSaleDeviceLine {
  itemId: number;
  unitPrice: string;
  warrantyUntil?: string;
}

export interface CreateSaleAccessoryLine {
  productModelId: number;
  quantity: number;
  unitPrice: string;
}

export type CreateSaleLine = CreateSaleDeviceLine | CreateSaleAccessoryLine;

export interface CreateSalePayload {
  locationId: number;
  lines: CreateSaleLine[];
  customerId?: number;
  dueDate?: string;
  payment?: {
    amount: string;
    method: PaymentMethod;
  };
}

export interface AddPaymentPayload {
  amount: string;
  method: PaymentMethod;
}

export interface CreateReturnPayload {
  saleItemId: number;
  quantity?: number;
  refundAmount: string;
  result: 'BACK_TO_STOCK' | 'DEFECTIVE';
  reason?: string;
}

export interface SaleFilters {
  status?: SaleStatus;
  customerId?: number;
  partnerId?: number;
  locationId?: number;
  from?: string;
  to?: string;
}
