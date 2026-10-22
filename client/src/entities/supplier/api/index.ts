import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import type {
  Supplier,
  SupplierSummary,
  SupplierPayment,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  CreateSupplierPaymentPayload,
} from '../model/types';

/** Fixed page size for the supplier payments history (matches the server default). */
export const SUPPLIER_PAYMENTS_PAGE_SIZE = 20;

export const supplierKeys = {
  all: ['suppliers'] as const,
  list: (all?: boolean) => [...supplierKeys.all, 'list', { all }] as const,
  /** Prefix across both supplier lists (any/all flag) for update-style invalidation. */
  lists: () => [...supplierKeys.all, 'list'] as const,
  detail: (id: number) => [...supplierKeys.all, 'detail', id] as const,
  payments: (id: number, page: number, pageSize: number) =>
    [...supplierKeys.all, 'payments', id, page, pageSize] as const,
  /** Prefix across every payments page of one supplier. */
  paymentsAll: (id: number) => [...supplierKeys.all, 'payments', id] as const,
};

/** Fetch suppliers pick-list; pass `all = true` to include deactivated suppliers. */
export function useSuppliers(all = false) {
  return useQuery({
    queryKey: supplierKeys.list(all),
    queryFn: async () => {
      const { data } = await api.get<SupplierSummary[]>('/suppliers', {
        params: all ? { all: 'true' } : undefined,
      });
      return data;
    },
  });
}

/** Fetch one supplier with contact data and balance (manage_suppliers only). */
export function useSupplier(id: number | undefined) {
  return useQuery({
    queryKey: supplierKeys.detail(id ?? 0),
    enabled: id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<Supplier>(`/suppliers/${id}`);
      return data;
    },
  });
}

/** Fetches the paginated supplier payment history, newest first. */
export function useSupplierPayments(id: number | undefined, page = 1) {
  return useQuery({
    queryKey: supplierKeys.payments(id ?? 0, page, SUPPLIER_PAYMENTS_PAGE_SIZE),
    enabled: id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<Page<SupplierPayment>>(`/suppliers/${id}/payments`, {
        params: { page: String(page), pageSize: String(SUPPLIER_PAYMENTS_PAGE_SIZE) },
      });
      return data;
    },
  });
}

/** Creates a supplier and invalidates the supplier lists (pick-lists and tables). */
export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierPayload) => {
      const { data } = await api.post<Supplier>('/suppliers', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

/** Updates a supplier (name, contacts or isActive) and invalidates its own lists and detail. */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateSupplierPayload }) => {
      const { data } = await api.patch<Supplier>(`/suppliers/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

/** Records a supplier payment (or negative correction); refreshes the balance and history. */
export function useCreateSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: CreateSupplierPaymentPayload;
    }) => {
      const { data } = await api.post<SupplierPayment>(`/suppliers/${id}/payments`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      // The balance is computed on read, so the supplier detail drives it (BR-8).
      void queryClient.invalidateQueries({ queryKey: supplierKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: supplierKeys.paymentsAll(variables.id) });
    },
  });
}
