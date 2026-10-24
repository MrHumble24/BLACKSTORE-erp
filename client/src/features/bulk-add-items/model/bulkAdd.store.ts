import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ItemCondition } from '@/entities/item';

export interface BulkAddCodes {
  imei: boolean;
  imei2: boolean;
  serial: boolean;
}

export interface BulkAddConfig {
  categoryId: number;
  productModelId: number;
  investorId: number;
  locationId: number;
  condition: ItemCondition;
  attributes: Record<string, string | number>;
  purchasePrice: string;
  salePrice: string;
  minSalePrice: string;
  codes: BulkAddCodes;
  /** Id of the user who saved these settings; another user starts clean (shared computers). */
  userId: number | null;
}

interface BulkAddState extends BulkAddConfig {
  setField: <K extends keyof BulkAddConfig>(key: K, value: BulkAddConfig[K]) => void;
  setCategory: (id: number) => void;
  setCodes: (partial: Partial<BulkAddCodes>) => void;
  reset: (userId?: number | null) => void;
  setUserId: (userId: number | null) => void;
}

const DEFAULT_CONFIG: BulkAddConfig = {
  categoryId: 0,
  productModelId: 0,
  investorId: 0,
  locationId: 0,
  condition: 'NEW',
  attributes: {},
  purchasePrice: '',
  salePrice: '',
  minSalePrice: '',
  codes: { imei: true, imei2: false, serial: false },
  userId: null,
};

/** Persisted bulk-add configuration (purchasePrice excluded to avoid cost on shared computers). */
export const useBulkAddStore = create<BulkAddState>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFIG,
      setField: (key, value) => set({ [key]: value }),
      setCategory: (id) =>
        set({
          categoryId: id,
          productModelId: 0,
          attributes: {},
        }),
      setCodes: (partial) =>
        set((state) => ({
          codes: { ...state.codes, ...partial },
        })),
      reset: (userId) => set({ ...DEFAULT_CONFIG, userId: userId ?? null }),
      setUserId: (userId) => set({ userId }),
    }),
    {
      name: 'blackstore-bulk-add',
      // Cost must not sit in localStorage on a shared computer; it is re-typed per session.
      partialize: (state) => {
        const { purchasePrice, ...rest } = state;
        void purchasePrice;
        return rest;
      },
    },
  ),
);

/** Config fields only (no actions); use with `useShallow` so unrelated store changes do not re-render. */
export const selectConfig = (s: BulkAddState): BulkAddConfig => ({
  categoryId: s.categoryId,
  productModelId: s.productModelId,
  investorId: s.investorId,
  locationId: s.locationId,
  condition: s.condition,
  attributes: s.attributes,
  purchasePrice: s.purchasePrice,
  salePrice: s.salePrice,
  minSalePrice: s.minSalePrice,
  codes: s.codes,
  userId: s.userId,
});
