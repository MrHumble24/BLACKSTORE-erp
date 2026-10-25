import type { Page } from '@/shared/types';

export type LedgerType = 'INCOME' | 'EXPENSE';

/** Admin's decision on an EXPENSE: PENDING (undecided), CONFIRMED (counts) or EXCLUDED (does not). */
export type ExpenseStatus = 'PENDING' | 'CONFIRMED' | 'EXCLUDED';

export interface LedgerEntry {
  id: number;
  type: LedgerType;
  category: string;
  amount: string;
  date: string;
  note: string | null;
  /** Admin's confirmation that this INCOME adds to net profit (BR-5); always false for EXPENSE. */
  countsInProfit: boolean;
  /** True = cash drawer, false = bank/card; drives the daily-close cash reconciliation (F13). */
  inCash: boolean;
  /** EXPENSE only: PENDING until the Admin confirms or excludes it (FR-27). Ignored for INCOME. */
  status: ExpenseStatus;
  user: { id: number; name: string };
}

export type LedgerPage = Page<LedgerEntry> & {
  /** `expense` counts CONFIRMED expenses only; pending/excluded are reported separately (BR-5). */
  totals: {
    income: string;
    expense: string;
    pendingExpense: string;
    excludedExpense: string;
    net: string;
  };
};

export interface LedgerFilters {
  type?: LedgerType;
  status?: ExpenseStatus;
  category?: string;
  from?: string;
  to?: string;
}

export interface CreateLedgerEntryPayload {
  type: LedgerType;
  category: string;
  amount: string;
  date?: string;
  note?: string;
  countsInProfit?: boolean;
  inCash?: boolean;
}
