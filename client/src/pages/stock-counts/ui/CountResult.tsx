import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/shared/lib';
import type { StockCount, ItemBrief } from '@/entities/stock-count';

/** A titled list of items (model + code), with its count in the heading. */
function ItemList({ title, items }: { title: string; items: ItemBrief[] }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-5 space-y-2">
      <p className="text-xs font-semibold text-ink">{title} · {items.length}</p>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate">{t('stockCount.none')}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="text-xs text-ink">
              <span className="font-medium">{item.productModel.name}</span>
              <span className="text-slate"> · {item.identifiers[0]?.value ?? `#${item.id}`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The unknown-codes list (code + scan time). */
function UnknownList({ unknown }: { unknown: StockCount['result']['unknown'] }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-5 space-y-2">
      <p className="text-xs font-semibold text-ink">{t('stockCount.unknown')} · {unknown.length}</p>
      {unknown.length === 0 ? (
        <p className="text-[11px] text-slate">{t('stockCount.none')}</p>
      ) : (
        <ul className="space-y-1">
          {unknown.map((u) => (
            <li key={`${u.code}-${u.scannedAt}`} className="text-xs text-ink">
              <span className="font-medium">{u.code}</span>
              <span className="text-slate"> · {formatDateTime(u.scannedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Summary counters plus the three result lists (missing, wrong location, unknown). */
export function CountResult({ count }: { count: StockCount }) {
  const { t } = useTranslation();
  const { result } = count;
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate">
        {t('stockCount.expectedFound', { expected: result.expectedCount, found: result.found })}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ItemList title={t('stockCount.missing')} items={result.missing} />
        <ItemList title={t('stockCount.wrongLocation')} items={result.wrongLocation} />
        <UnknownList unknown={result.unknown} />
      </div>
    </div>
  );
}
