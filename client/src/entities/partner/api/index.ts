import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import type {
  Partner,
  PartnerReport,
  CreatePartnerPayload,
  UpdatePartnerPayload,
} from '../model/types';

export const partnerKeys = {
  all: ['partners'] as const,
  lists: () => [...partnerKeys.all, 'list'] as const,
  list: (search?: string, page = 1, pageSize = 20) =>
    [...partnerKeys.lists(), { search, page, pageSize }] as const,
  details: () => [...partnerKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...partnerKeys.details(), String(id)] as const,
};

/** Fetch paginated list of partner reports with optional name/phone search. */
export function usePartners(search?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: partnerKeys.list(search, page, pageSize),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (search?.trim()) {
        params.search = search.trim();
      }
      const { data } = await api.get<Page<PartnerReport>>('/partners', { params });
      return data;
    },
  });
}

/** Fetch detailed report for a single partner by id. */
export function usePartner(id: number | string) {
  return useQuery({
    queryKey: partnerKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<PartnerReport>(`/partners/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

/** Create a new partner and invalidate partners cache. */
export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePartnerPayload) => {
      const { data } = await api.post<Partner>('/partners', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}

/** Update an existing partner and invalidate partner detail and lists. */
export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdatePartnerPayload;
    }) => {
      const { data } = await api.patch<Partner>(`/partners/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: partnerKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: partnerKeys.lists() });
    },
  });
}
