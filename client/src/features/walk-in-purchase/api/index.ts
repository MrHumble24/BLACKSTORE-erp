import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { itemKeys, type Item } from '@/entities/item';
import type { ItemCondition, IdentifierType } from '@/entities/item';

export interface CreateWalkInPurchasePayload {
  seller: { name: string; phone: string };
  productModelId: number;
  locationId: number;
  /** Defaults to the business (isOwn) investor on the server when omitted. */
  investorId?: number;
  identifiers: { type: IdentifierType; value: string }[];
  condition: ItemCondition;
  attributes?: Record<string, string | number>;
  /** The cash handed to the seller; Staff may send it without manage_prices (FR-25). */
  pricePaid: string;
}

/** Registers a walk-in purchase and returns the created (or bought-back) item. */
export function useCreateWalkInPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWalkInPurchasePayload) => {
      const { data } = await api.post<Item>('/walk-in-purchases', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: itemKeys.details() });
    },
  });
}
