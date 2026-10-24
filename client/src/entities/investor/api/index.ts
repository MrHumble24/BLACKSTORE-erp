import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page, TelegramLinkResult } from '@/shared/types';
import type {
  Investor,
  InvestorTransaction,
  InvestorSupplierPayment,
  InvestorAccount,
  CreateInvestorPayload,
  UpdateInvestorPayload,
  CreateInvestorTransactionPayload,
} from '../model/types';

export const investorKeys = {
  all: ['investors'] as const,
  list: (all?: boolean) => [...investorKeys.all, 'list', { all }] as const,
  detail: (id: number) => [...investorKeys.all, 'detail', { id }] as const,
  transactions: (id: number, page: number, pageSize: number) =>
    [...investorKeys.all, 'transactions', { id, page, pageSize }] as const,
  supplierPayments: (id: number, page: number, pageSize: number) =>
    [...investorKeys.all, 'supplier-payments', { id, page, pageSize }] as const,
  account: (id: number, page: number, pageSize: number) =>
    [...investorKeys.all, 'account', { id, page, pageSize }] as const,
};

/**
 * Fetch investors list. Defaults to active only; pass `all = true` for inactive investors as well.
 */
export function useInvestors(all = false) {
  return useQuery({
    queryKey: investorKeys.list(all),
    queryFn: async () => {
      const { data } = await api.get<Investor[]>('/investors', {
        params: all ? { all: 'true' } : undefined,
      });
      return data;
    },
  });
}

/** Fetch one investor with share settings and balance (manage_investors only). */
export function useInvestor(id: number | undefined) {
  return useQuery({
    queryKey: investorKeys.detail(id ?? 0),
    enabled: id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<Investor>(`/investors/${id}`);
      return data;
    },
  });
}

/** Fetches the paginated investor money transactions, newest first. */
export function useInvestorTransactions(id: number | undefined, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: investorKeys.transactions(id ?? 0, page, pageSize),
    enabled: id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<Page<InvestorTransaction>>(
        `/investors/${id}/transactions`,
        { params: { page: String(page), pageSize: String(pageSize) } },
      );
      return data;
    },
  });
}

/** Fetches the paginated supplier payments made with this investor's money, newest first. */
export function useInvestorSupplierPayments(id: number | undefined, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: investorKeys.supplierPayments(id ?? 0, page, pageSize),
    enabled: id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<Page<InvestorSupplierPayment>>(
        `/investors/${id}/supplier-payments`,
        { params: { page: String(page), pageSize: String(pageSize) } },
      );
      return data;
    },
  });
}

/** Fetches the investor account (owed number + one page of statement lines) for a linked investor (F26). */
export function useInvestorAccount(id: number | undefined, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: investorKeys.account(id ?? 0, page, pageSize),
    enabled: id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<InvestorAccount>(`/investors/${id}/account`, {
        params: { page: String(page), pageSize: String(pageSize) },
      });
      return data;
    },
  });
}

/** Creates an investor and invalidates the investor lists. */
export function useCreateInvestor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInvestorPayload) => {
      const { data } = await api.post<Investor>('/investors', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: investorKeys.all });
    },
  });
}

/** Updates an investor (name, code, share settings or isActive). */
export function useUpdateInvestor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateInvestorPayload }) => {
      const { data } = await api.patch<Investor>(`/investors/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: investorKeys.all });
    },
  });
}

/** Records a deposit or payout for an investor; refreshes balances and the transaction list. */
export function useCreateInvestorTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: CreateInvestorTransactionPayload;
    }) => {
      const { data } = await api.post<InvestorTransaction>(
        `/investors/${id}/transactions`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: investorKeys.all });
    },
  });
}

/** Mints the investor's one-time Telegram invite link (POST /investors/:id/telegram-link). */
export function useInvestorTelegramLink() {
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<TelegramLinkResult>(`/investors/${id}/telegram-link`);
      return data;
    },
  });
}

/** Removes the investor's Telegram link (DELETE /investors/:id/telegram-link, manage_investors). */
export function useInvestorTelegramUnlink() {
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/investors/${id}/telegram-link`);
    },
  });
}
