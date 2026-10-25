import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { saleKeys, type SaleSummary } from '@/entities/sale';
import { businessDayKeys } from '@/entities/business-day';

/** Confirming changes what counts in today's drawer, so sales and the business day are refetched. */
function useInvalidateAfterConfirm() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: saleKeys.all });
    void queryClient.invalidateQueries({ queryKey: businessDayKeys.all });
  };
}

/** Confirms one sale at the daily close (close_day); its money then counts in the drawer (F33). */
export function useConfirmSale() {
  const onSuccess = useInvalidateAfterConfirm();
  return useMutation({
    mutationFn: async (saleId: number) => {
      const { data } = await api.patch<SaleSummary>(`/sales/${saleId}/confirm`);
      return data;
    },
    onSuccess,
  });
}

/** Undoes a confirmation made in the still-open day (server returns 409 otherwise). */
export function useUnconfirmSale() {
  const onSuccess = useInvalidateAfterConfirm();
  return useMutation({
    mutationFn: async (saleId: number) => {
      const { data } = await api.patch<SaleSummary>(`/sales/${saleId}/unconfirm`);
      return data;
    },
    onSuccess,
  });
}

/** Confirms many sales at once (1–200 ids); already-confirmed ids are skipped by the server. */
export function useConfirmSales() {
  const onSuccess = useInvalidateAfterConfirm();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await api.patch<{ confirmed: number }>('/sales/confirm', { ids });
      return data;
    },
    onSuccess,
  });
}
