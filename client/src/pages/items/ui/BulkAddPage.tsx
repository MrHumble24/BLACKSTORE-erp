import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { BackLink } from '@/shared/ui';
import { useCategories } from '@/entities/category';
import {
  BulkAddCodesToggle,
  BulkAddSettings,
  BulkAddedList,
  BulkScanPanel,
  selectConfig,
  useBulkAddStore,
  useBulkAddUserGuard,
  useBulkScan,
} from '@/features/bulk-add-items';

/** Bulk add page: configure once, then scan codes so each finished device POSTs /items. */
export function BulkAddPage() {
  const { t } = useTranslation();
  const { ready } = useBulkAddUserGuard();
  const config = useBulkAddStore(useShallow(selectConfig));
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

      {/* Settings stay hidden until the store belongs to this user (no flash of another user's values). */}
      {ready && <BulkAddSettings scan={scan} />}
      {ready && <BulkAddCodesToggle scan={scan} />}
      <BulkScanPanel scan={scan} inputRef={inputRef} />
      <BulkAddedList added={scan.added} />
    </div>
  );
}
