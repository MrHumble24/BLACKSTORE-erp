import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import { formatDate } from '@/shared/lib';
import type { TransferSummary } from '@/entities/transfer';

function TransferRow({ transfer }: { transfer: TransferSummary }) {
  const { t } = useTranslation();
  const lines = [
    transfer.itemCount ? t('transfers.itemsN', { count: transfer.itemCount }) : null,
    transfer.accessoryUnits ? t('transfers.accessoriesN', { count: transfer.accessoryUnits }) : null,
  ].filter(Boolean).join(', ');

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell>
        <Link to={`/transfers/${transfer.id}`} className="font-medium text-apple-blue underline-offset-4 hover:underline">
          {formatDate(transfer.date)}
        </Link>
      </TableCell>
      <TableCell className="text-xs text-ink">{transfer.fromLocation.name}</TableCell>
      <TableCell className="text-xs text-ink">{transfer.toLocation.name}</TableCell>
      <TableCell className="text-xs text-slate">{transfer.user.name}</TableCell>
      <TableCell className="text-xs text-ink">{lines || '—'}</TableCell>
      <TableCell className="text-xs text-slate">{transfer.note ?? '—'}</TableCell>
    </TableRow>
  );
}

/** Transfers list table: date, from, to, user, moved lines, note. */
export function TransfersTable({ transfers, isLoading }: { transfers: TransferSummary[]; isLoading: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('transfers.date')}</TableHead>
            <TableHead>{t('transfers.from')}</TableHead>
            <TableHead>{t('transfers.to')}</TableHead>
            <TableHead>{t('transfers.user')}</TableHead>
            <TableHead>{t('transfers.items')}</TableHead>
            <TableHead>{t('transfers.note')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={6} />}
          {!isLoading && transfers.length === 0 && (
            <TableEmptyRow colSpan={6} message={t('transfers.noTransfers')} />
          )}
          {!isLoading && transfers.map((transfer) => (
            <TransferRow key={transfer.id} transfer={transfer} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
