import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import type {
  Sale,
  SaleSummary,
  CreateSalePayload,
  AddPaymentPayload,
  CreateReturnPayload,
  SaleFilters,
} from '../model/types';

export const saleKeys = {
  all: ['sales'] as const,
  lists: () => [...saleKeys.all, 'list'] as const,
  list: (filters: SaleFilters, page: number, pageSize: number) =>
    [...saleKeys.lists(), { filters, page, pageSize }] as const,
  details: () => [...saleKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...saleKeys.details(), String(id)] as const,
};

function buildSaleQueryParams(filters: SaleFilters, page: number, pageSize: number) {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };
  if (filters.status) params.status = filters.status;
  if (filters.customerId) params.customerId = String(filters.customerId);
  if (filters.partnerId) params.partnerId = String(filters.partnerId);
  if (filters.locationId) params.locationId = String(filters.locationId);
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

/** Fetch paginated sales list newest first with status, customer, location, and date filters. */
export function useSales(filters: SaleFilters = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: saleKeys.list(filters, page, pageSize),
    queryFn: async () => {
      const params = buildSaleQueryParams(filters, page, pageSize);
      const { data } = await api.get<Page<SaleSummary>>('/sales', { params });
      return data;
    },
  });
}

/** Fetch single sale details including items, payments and returns. */
export function useSale(id: number | string) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Sale>(`/sales/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

/** Creates a new sale and invalidates sales, items, accessory stock and customers. */
export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSalePayload) => {
      const { data } = await api.post<Sale>('/sales', payload);
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.setQueryData(saleKeys.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: ['items'] });
      void queryClient.invalidateQueries({ queryKey: ['accessory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

/** Records a payment on a DEBT sale. */
export function useAddSalePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      saleId,
      payload,
    }: {
      saleId: number;
      payload: AddPaymentPayload;
    }) => {
      const { data } = await api.post<Sale>(`/sales/${saleId}/payments`, payload);
      return data;
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(saleKeys.detail(variables.saleId), data);
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      void queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

/** Records a return for a sale line item. */
export function useCreateSaleReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      saleId,
      payload,
    }: {
      saleId: number;
      payload: CreateReturnPayload;
    }) => {
      const { data } = await api.post<Sale>(`/sales/${saleId}/returns`, payload);
      return data;
    },
    onSuccess: (data, variables) => {
      void queryClient.setQueryData(saleKeys.detail(variables.saleId), data);
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['items'] });
      void queryClient.invalidateQueries({ queryKey: ['accessory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
