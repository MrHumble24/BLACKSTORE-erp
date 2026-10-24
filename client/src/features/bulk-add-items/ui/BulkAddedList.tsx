import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ItemConditionBadge } from '@/entities/item';
import type { Item } from '@/entities/item';

/** One session row: model name, its codes and a condition badge linking to the device. */
function AddedRow({ item }: { item: Item }) {
  const codes = item.identifiers.map((identifier) => identifier.value).join(' · ');

  return (
    <Link
      to={`/items/${item.id}`}
      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 hover:bg-studio-mist transition-colors"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink truncate">{item.productModel.name}</p>
        <p className="text-[11px] text-slate break-all">{codes}</p>
      </div>
      <ItemConditionBadge condition={item.condition} />
    </Link>
  );
}

/** Simple list of the devices bulk-added in this browser session, newest first. */
export function BulkAddedList({ added }: { added: Item[] }) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-base font-semibold text-ink">{t('bulkAdd.addedList')}</div>
        {added.length > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-studio-mist border border-hairline-silver/60 text-slate">
            {added.length}
          </span>
        )}
      </div>
      {added.length === 0 ? (
        <p className="text-sm text-slate px-1">{t('bulkAdd.emptyList')}</p>
      ) : (
        <div className="space-y-1">
          {added.map((item) => (
            <AddedRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
