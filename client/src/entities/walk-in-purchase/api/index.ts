import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import { businessDayKeys } from '@/entities/business-day';
import { itemKeys } from '@/entities/item';
import type { WalkInPayoutRow } from '../model/types';

export const WALK_IN_PAYOUTS_PAGE_SIZE = 20;

export const walkInPayoutKeys = {
  all: ['walk-in-payouts'] as const,
  pending: (page: number) => [...walkInPayoutKeys.all, 'pending', page] as const,
};

/** Unconfirmed walk-in payouts from any day, oldest first (close_day only). */
export function usePendingWalkInPayouts(page = 1) {
  return useQuery({
    queryKey: walkInPayoutKeys.pending(page),
    queryFn: async () => {
      const params = { page: String(page), pageSize: String(WALK_IN_PAYOUTS_PAGE_SIZE) };
      const { data } = await api.get<Page<WalkInPayoutRow>>('/walk-in-purchases/pending', { params });
      return data;
    },
  });
}

/**
 * Shared mutation for pay / unpay. A payout changes the open day's expected cash and the
 * device panel, so the payout list, the business day and items are all refetched.
 */
function useWalkInPayoutMutation(action: 'pay' | 'unpay') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lineId: number) => {
      const { data } = await api.patch<WalkInPayoutRow>(`/walk-in-purchases/${lineId}/${action}`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walkInPayoutKeys.all });
      void queryClient.invalidateQueries({ queryKey: businessDayKeys.all });
      void queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

/** Confirms the cash was handed to the walk-in seller; it then counts on today's drawer. */
export function useMarkWalkInPaid() {
  return useWalkInPayoutMutation('pay');
}

/** Undoes a payout confirmed in the still-open day (server returns 409 once the day is closed). */
export function useUndoWalkInPaid() {
  return useWalkInPayoutMutation('unpay');
}
