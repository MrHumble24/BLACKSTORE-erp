import { useEffect, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { itemQueryOptions, type Item } from '@/entities/item';
import type { HandoverLine } from './types';

/** Parses the `?items=1,2,3` param into unique positive integer ids. */
export function parseItemIds(raw: string | null): number[] {
  if (!raw) return [];
  const ids = raw.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  // Capped to match the server's ArrayMaxSize(200) on POST /consignments.
  return [...new Set(ids)].slice(0, 200);
}

/**
 * Loads the given items fresh and adds the in-stock ones to the handover lines once
 * (used when the sell page hands its scanned devices over). Failed or no-longer-in-stock
 * items are skipped and reported in one toast. Returns true while still loading.
 */
export function usePrefillLines(
  ids: number[],
  setLines: React.Dispatch<React.SetStateAction<HandoverLine[]>>,
) {
  const { t } = useTranslation();
  const done = useRef(false);
  const results = useQueries({
    queries: ids.map((id) => ({ ...itemQueryOptions(id), staleTime: 0, retry: false })),
  });
  // isFetchedAfterMount ignores cached data and turns true on success or error, so it never hangs.
  const settled = results.every((r) => r.isFetchedAfterMount);

  useEffect(() => {
    if (done.current || ids.length === 0 || !settled) return;
    done.current = true;
    const inStock = results
      .filter((r) => r.isSuccess && r.data?.status === 'IN_STOCK')
      .map((r) => r.data as Item);
    setLines((prev) => [
      ...prev,
      ...inStock
        .filter((item) => !prev.some((l) => l.item.id === item.id))
        .map((item) => ({ item, minPrice: item.salePrice ?? '' })),
    ]);
    const skipped = ids.length - inStock.length;
    if (skipped > 0) toast.error(t('consign.prefillSkipped', { n: skipped }));
  }, [settled, ids, results, setLines, t]);

  return ids.length > 0 && !settled;
}
