import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  TableLoadingRow, TableEmptyRow, Button, Badge,
} from '@/shared/ui';
import { cn, formatMoney } from '@/shared/lib';
import { WatchActiveToggle, isWatchSynced, type Watch } from '@/entities/watch';

const MAX_ALIAS_CHIPS = 3;
const COLUMNS = 7;

/** First three aliases as chips plus a "+n" counter for the rest. */
function AliasChips({ aliases }: { aliases: string[] }) {
  if (aliases.length === 0) return <span className="text-slate">—</span>;
  const rest = aliases.length - MAX_ALIAS_CHIPS;
  return (
    <div className="flex flex-wrap gap-1">
      {aliases.slice(0, MAX_ALIAS_CHIPS).map((alias) => (
        <Badge key={alias} variant="secondary" className="px-2 py-0 text-[11px]">{alias}</Badge>
      ))}
      {rest > 0 && <Badge variant="outline" className="px-2 py-0 text-[11px]">+{rest}</Badge>}
    </div>
  );
}

/** Green dot when the Watcher has the latest version, amber with a tooltip otherwise. */
function SyncDot({ watch }: { watch: Watch }) {
  const { t } = useTranslation();
  const synced = isWatchSynced(watch);
  const label = synced ? t('watches.synced') : t('watches.notSynced');
  return (
    <span
      role="img"
      title={label}
      aria-label={label}
      className={cn('inline-block h-2.5 w-2.5 rounded-full', synced ? 'bg-emerald-500' : 'bg-amber-500')}
    />
  );
}

/** One watch row with the active toggle and edit button. */
function WatchRow({ watch, onEdit }: { watch: Watch; onEdit: (w: Watch) => void }) {
  const { t } = useTranslation();
  return (
    <TableRow className="hover:bg-studio-mist/60">
      <TableCell className="text-xs font-medium text-ink">{watch.name}</TableCell>
      <TableCell className="text-xs"><AliasChips aliases={watch.aliases} /></TableCell>
      <TableCell className="text-xs text-slate">{watch.productModel?.name ?? '—'}</TableCell>
      <TableCell className="text-right text-xs tabular-nums">
        {watch.maxPrice ? `${formatMoney(watch.maxPrice)} ${watch.currency}` : '—'}
      </TableCell>
      <TableCell><WatchActiveToggle watch={watch} /></TableCell>
      <TableCell className="text-center"><SyncDot watch={watch} /></TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={() => onEdit(watch)} aria-label={t('common.edit')} className="h-7 w-7 p-0">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface WatchesTableProps {
  watches: Watch[];
  isLoading: boolean;
  onEdit: (watch: Watch) => void;
}

/** Watches list: name, aliases, model, max price, active toggle, sync state, edit. */
export function WatchesTable({ watches, isLoading, onEdit }: WatchesTableProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-control-gray/30 text-[11px]">
            <TableHead>{t('watches.name')}</TableHead>
            <TableHead>{t('watches.aliases')}</TableHead>
            <TableHead>{t('watches.productModel')}</TableHead>
            <TableHead className="text-right">{t('watches.maxPrice')}</TableHead>
            <TableHead>{t('common.active')}</TableHead>
            <TableHead className="text-center">{t('watches.syncedColumn')}</TableHead>
            <TableHead className="text-right">{t('common.edit')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingRow colSpan={COLUMNS} />
          ) : watches.length === 0 ? (
            <TableEmptyRow colSpan={COLUMNS} message={t('watches.noWatches')} />
          ) : (
            watches.map((w) => <WatchRow key={w.id} watch={w} onEdit={onEdit} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}
