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
  /** Detail only: the supplier record this investor ships under (F26); null when not linked. */
  supplier?: { id: number; name: string; isActive: boolean } | null;
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
  /** Also create (or link) a supplier record with the same name (F26). */
  shipsDevices?: boolean;
}

export interface UpdateInvestorPayload {
  name?: string;
  code?: string;
  shareType?: ShareType;
  shareValue?: string;
  isActive?: boolean;
  /** Link to a supplier record; explicit null unlinks (F26). */
  supplierId?: number | null;
}

export interface CreateInvestorTransactionPayload {
  type: InvestorTxType;
  amount: string;
  date?: string;
  note?: string;
}

/** What one statement line is about; the sign of `amount` says whether the shop owes more or less. */
export type AccountLineKind = 'GOODS' | 'SENT' | 'FEE' | 'SHARE' | 'RETURN' | 'CASH_IN' | 'CASH_OUT';

/** One line of the investor account statement (GET /investors/:id/account). */
export interface AccountLine {
  /** Unique per statement (`${kind}-${sortId}`): the row key. */
  id: string;
  date: string;
  kind: AccountLineKind;
  /** Signed effect on owedToInvestor: + the shop owes more, − it owes less. */
  amount: string;
  params: { count?: number; model?: string; supplierName?: string };
  ref: { kind: 'batch' | 'sale' | 'supplier' | 'transaction'; id: number } | null;
}

/** Investor account: the one number (signed; + the shop owes) and a page of its lines. */
export interface InvestorAccount {
  owedToInvestor: string;
  lines: AccountLine[];
  total: number;
  page: number;
  pageSize: number;
}
