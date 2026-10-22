import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { ReceiptSettings, UpdateReceiptSettingsPayload } from '../model/types';

export const receiptSettingsKeys = {
  all: ['receipt-settings'] as const,
};

/** Fetch receipt header and footer settings. */
export function useReceiptSettings() {
  return useQuery({
    queryKey: receiptSettingsKeys.all,
    queryFn: async () => {
      const { data } = await api.get<ReceiptSettings>('/settings/receipt');
      return data;
    },
  });
}

/** Updates receipt settings. */
export function useUpdateReceiptSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateReceiptSettingsPayload) => {
      const { data } = await api.patch<ReceiptSettings>('/settings/receipt', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(receiptSettingsKeys.all, data);
      void queryClient.invalidateQueries({ queryKey: receiptSettingsKeys.all });
    },
  });
}
