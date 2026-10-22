import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  TableLoadingRow, TableEmptyRow, Badge,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import type { StockCountSummary } from '@/entities/stock-count';

function CountRow({ count }: { count: StockCountSummary }) {
  const { t } = useTranslation();
  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell>
        <Link to={`/stock-counts/${count.id}`} className="font-medium text-apple-blue underline-offset-4 hover:underline">
          {count.location.name}
        </Link>
      </TableCell>
      <TableCell className="text-xs text-slate">{count.user.name}</TableCell>
      <TableCell className="text-xs text-ink">{formatDateTime(count.startedAt)}</TableCell>
      <TableCell className="text-xs">
        {count.finishedAt ? (
          <span className="text-slate">{formatDateTime(count.finishedAt)}</span>
        ) : (
          <Badge variant="default" className="px-2.5 py-0.5 text-[11px]">{t('stockCount.open')}</Badge>
        )}
      </TableCell>
      <TableCell className="text-xs text-ink">{count.scannedCount}</TableCell>
    </TableRow>
  );
}

/** Stock counts list table: location, user, started, finished, scanned count. */
export function StockCountsTable({ counts, isLoading }: { counts: StockCountSummary[]; isLoading: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('stockCount.location')}</TableHead>
            <TableHead>{t('stockCount.user')}</TableHead>
            <TableHead>{t('stockCount.started')}</TableHead>
            <TableHead>{t('stockCount.finished')}</TableHead>
            <TableHead>{t('stockCount.scanned')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={5} />}
          {!isLoading && counts.length === 0 && (
            <TableEmptyRow colSpan={5} message={t('stockCount.noCounts')} />
          )}
          {!isLoading && counts.map((count) => <CountRow key={count.id} count={count} />)}
        </TableBody>
      </Table>
    </div>
  );
}
