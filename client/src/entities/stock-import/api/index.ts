import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { itemKeys } from '@/entities/item';
import type { ImportResult } from '../model/types';

/**
 * Imports stock from an .xlsx file (FR-7, manage_prices). The parsed rows are
 * created independently: the response tells how many landed and which rows failed.
 */
export function useImportItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      // No Content-Type header: axios sets the multipart boundary for FormData.
      const { data } = await api.post<ImportResult>('/items/import', form);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}
