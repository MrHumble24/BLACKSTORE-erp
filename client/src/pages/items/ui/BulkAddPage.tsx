import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { BackLink } from '@/shared/ui';
import { useCategories } from '@/entities/category';
import { useAuthStore } from '@/entities/session';
import {
  useBulkAddStore,
  useBulkScan,
} from '@/features/bulk-add-items/model';
import { BulkAddSettings } from '@/features/bulk-add-items/ui/BulkAddSettings';
import { BulkAddCodesToggle } from '@/features/bulk-add-items/ui/BulkAddCodesToggle';
import { BulkScanPanel } from '@/features/bulk-add-items/ui/BulkScanPanel';
import { BulkAddedList } from '@/features/bulk-add-items/ui/BulkAddedList';

/** Bulk add page: configure once, then scan codes so each finished device POSTs /items. */
export function BulkAddPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const userId = user?.id ?? null;

  const storeUserId = useBulkAddStore((s) => s.userId);
  const reset = useBulkAddStore((s) => s.reset);
  const setUserId = useBulkAddStore((s) => s.setUserId);

  useEffect(() => {
    if (isAuthLoading || userId === null) return;
    if (storeUserId !== null && storeUserId !== userId) {
      reset(userId);
    } else if (storeUserId === null) {
      setUserId(userId);
    }
  }, [isAuthLoading, storeUserId, userId, reset, setUserId]);

  const config = useBulkAddStore(
    useShallow((s) => ({
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
    })),
  );
  const { data: categories = [] } = useCategories();
  const selectedCategory = categories.find((c) => c.isSerialized && c.id === config.categoryId);

  // Scanning is a one-hand flow: the input must regain focus after every code.
  const inputRef = useRef<HTMLInputElement>(null);
  const scan = useBulkScan({
    config,
    attributesList: selectedCategory?.attributes ?? [],
    onRefocus: () => inputRef.current?.focus(),
  });

  return (
    <div className="max-w-4xl space-y-5">
      <div className="space-y-2">
        <BackLink to="/items" label={t('common.back')} />
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink">
            {t('bulkAdd.title')}
          </h1>
          <p className="text-xs text-slate mt-1">{t('bulkAdd.subtitle')}</p>
        </div>
      </div>

      <BulkAddSettings scan={scan} />
      <BulkAddCodesToggle scan={scan} />
      <BulkScanPanel scan={scan} inputRef={inputRef} />
      <BulkAddedList added={scan.added} />
    </div>
  );
}
