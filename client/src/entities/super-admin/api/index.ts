import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type {
  HardDeletePreviewRequest,
  HardDeleteReport,
  HardDeleteRequest,
  HardDeleteResult,
} from '../model/types';

const BASE = '/super-admin/hard-delete';

// Broad caches a hard delete can touch; invalidated so every list refreshes afterwards.
const AFFECTED_KEYS = [
  ['items'],
  ['accessory-stock'],
  ['sales'],
  ['categories'],
  ['product-models'],
  ['dashboard'],
] as const;

/** Reads the blast radius of a hard delete without writing anything (super admin only). */
export function useHardDeletePreview() {
  return useMutation({
    mutationFn: async (payload: HardDeletePreviewRequest) => {
      const { data } = await api.post<HardDeleteReport>(`${BASE}/preview`, payload);
      return data;
    },
  });
}

/** Permanently deletes the target; server re-checks the password (wrong → 401). */
export function useHardDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: HardDeleteRequest) => {
      const { data } = await api.post<HardDeleteResult>(BASE, payload);
      return data;
    },
    onSuccess: () => {
      for (const key of AFFECTED_KEYS) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
