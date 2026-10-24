export type ShareType = 'PERCENT' | 'FIXED_PER_ITEM' | 'NONE';

export interface Investor {
  id: number;
  name: string;
  code: string;
  isOwn: boolean;
  isActive: boolean;
  shareType?: ShareType;
  shareValue?: string | null;
  balance?: string;
  /** Detail only, needs view_cost, never for the OWN investor: the money trail (F25). */
  money?: InvestorMoney;
  /** Detail response only: true once the investor opened the bot invite link. */
  telegramLinked?: boolean;
  /** Detail only: link time and the name of the staff user who issued the used invite (null for pre-F24 links). */
  telegramLinkedAt?: string | null;
  telegramLinkedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Investor money trail, all decimal strings except the item counts (BR-8: computed, never typed). */
export interface InvestorMoney {
  deposits: string;
  payouts: string;
  sentToSuppliers: string;
  feesCharged: string;
  /** deposits − payouts − sentToSuppliers − feesCharged; may be negative. */
  unsentDeposits: string;
  unsoldItems: number;
  unsoldAtCost: string;
  defectiveItems: number;
}

/** Supplier payment made with this investor's money (GET /investors/:id/supplier-payments). */
export interface InvestorSupplierPayment {
  id: number;
  date: string;
  amount: string;
  fee: string;
  feePaidBy: 'BUSINESS' | 'INVESTOR';
  note: string | null;
  supplier: { id: number; name: string };
}

export type InvestorTxType = 'DEPOSIT' | 'PAYOUT';

export interface InvestorTransaction {
  id: number;
  type: InvestorTxType;
  amount: string;
  date: string;
  note: string | null;
}

export interface CreateInvestorPayload {
  name: string;
  code: string;
  shareType: ShareType;
  shareValue?: string;
}

export interface UpdateInvestorPayload {
  name?: string;
  code?: string;
  shareType?: ShareType;
  shareValue?: string;
  isActive?: boolean;
}

export interface CreateInvestorTransactionPayload {
  type: InvestorTxType;
  amount: string;
  date?: string;
  note?: string;
}
