import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import { useBulkAddStore } from '../model/bulkAdd.store';
import type { BulkScanState } from '../model/useBulkScan';

type PriceKey = 'purchasePrice' | 'salePrice' | 'minSalePrice';

const PRICE_FIELDS: Array<{ key: PriceKey; id: string; label: string; costOnly: boolean }> = [
  { key: 'purchasePrice', id: 'bulk-purchase-price', label: 'items.purchasePrice', costOnly: true },
  { key: 'salePrice', id: 'bulk-sale-price', label: 'items.salePrice', costOnly: false },
  { key: 'minSalePrice', id: 'bulk-min-sale-price', label: 'items.minSalePrice', costOnly: false },
];

/** The three price inputs; the purchase price is additionally hidden without view_cost. */
export function BulkAddPriceFields({ scan }: { scan: BulkScanState }) {
  const { t } = useTranslation();
  const store = useBulkAddStore();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));

  const setPrice = (key: PriceKey, value: string) => {
    store.setField(key, value);
    scan.clearConfigError(key);
  };

  return (
    <div className="space-y-3 pt-1 border-t border-hairline-silver/60">
      <div className="text-xs font-semibold text-ink tracking-tight uppercase">
        {t('items.pricing')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRICE_FIELDS.filter((price) => canViewCost || !price.costOnly).map((price) => (
          <TextField
            key={price.key}
            id={price.id}
            label={t(price.label)}
            inputMode="decimal"
            placeholder="0.00"
            value={store[price.key]}
            error={scan.configErrors[price.key]}
            disabled={scan.isCreating}
            onChange={(e) => setPrice(price.key, e.target.value)}
          />
        ))}
      </div>
    </div>
  );
}
