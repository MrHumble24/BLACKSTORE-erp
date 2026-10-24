import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import { useBulkAddStore } from '../model/bulkAdd.store';
import { BulkAddSettingsFields } from './BulkAddSettingsFields';
import { BulkAddPriceFields } from './BulkAddPriceFields';
import type { BulkScanState } from '../model/useBulkScan';

/**
 * One-time device settings card: every field reads and writes the persisted bulk-add store.
 * Price inputs follow ItemPriceInputs gating: none without manage_prices, purchase needs view_cost.
 */
export function BulkAddSettings({ scan }: { scan: BulkScanState }) {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const resetStore = useBulkAddStore((s) => s.reset);

  // Reset may change the enabled codes, so the half-scanned device is dropped (else its step is gone).
  const reset = () => {
    resetStore(userId);
    scan.clearAllConfigErrors();
    scan.cancelDevice();
  };

  return (
    <section className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 space-y-4 shadow-none">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-ink">{t('bulkAdd.settings')}</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={scan.isCreating}
          className="h-7 px-3 text-xs"
        >
          {t('bulkAdd.resetSettings')}
        </Button>
      </div>

      <BulkAddSettingsFields scan={scan} />
      {canManagePrices && <BulkAddPriceFields scan={scan} />}
    </section>
  );
}
