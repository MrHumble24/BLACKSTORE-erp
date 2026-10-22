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
  createdAt: string;
  updatedAt: string;
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
