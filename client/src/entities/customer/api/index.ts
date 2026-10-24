import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page, TelegramLinkResult } from '@/shared/types';
import type {
  Customer,
  CustomerDetail,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from '../model/types';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (search?: string, page = 1, pageSize = 20, hasDebt = false) =>
    [...customerKeys.lists(), { search, page, pageSize, hasDebt }] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
};

/** Fetch paginated customers optionally filtered by search (name or phone). */
export function useCustomers(search?: string, page = 1, pageSize = 20, hasDebt = false) {
  return useQuery({
    queryKey: customerKeys.list(search, page, pageSize, hasDebt),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (search?.trim()) params.search = search.trim();
      if (hasDebt) params.hasDebt = 'true';

      const { data } = await api.get<Page<Customer>>('/customers', { params });
      return data;
    },
  });
}

/** Fetch customer details with aggregated debt. */
export function useCustomer(id: number) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<CustomerDetail>(`/customers/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

/** Creates a customer and invalidates customers list. */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCustomerPayload) => {
      const { data } = await api.post<Customer>('/customers', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

/** Updates customer info and invalidates customer queries. */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateCustomerPayload;
    }) => {
      const { data } = await api.patch<Customer>(`/customers/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

/** Mints the customer's one-time Telegram invite link (POST /customers/:id/telegram-link). */
export function useCustomerTelegramLink() {
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<TelegramLinkResult>(`/customers/${id}/telegram-link`);
      return data;
    },
  });
}
