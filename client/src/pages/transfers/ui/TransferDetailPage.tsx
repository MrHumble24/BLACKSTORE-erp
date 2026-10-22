import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BackLink, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyRow,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import { ItemStatusBadge } from '@/entities/item';
import { useTransfer, type Transfer } from '@/entities/transfer';

/** One labelled line in the header card. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-slate tracking-[-0.01em]">{label}</p>
      <p className="text-xs font-medium text-ink">{value}</p>
    </div>
  );
}

/** Header card: date, route, user and note. */
function TransferHeader({ transfer }: { transfer: Transfer }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
      <Field label={t('transfers.date')} value={formatDateTime(transfer.date)} />
      <Field label={t('transfers.route')} value={`${transfer.fromLocation.name} → ${transfer.toLocation.name}`} />
      <Field label={t('transfers.user')} value={transfer.user.name} />
      <Field label={t('transfers.note')} value={transfer.note ?? '—'} />
    </div>
  );
}

/** The moved devices table. */
function TransferItemsTable({ transfer }: { transfer: Transfer }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('transfers.model')}</TableHead>
            <TableHead>{t('transfers.code')}</TableHead>
            <TableHead>{t('transfers.statusLabel')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfer.items.length === 0 && <TableEmptyRow colSpan={3} message={t('transfers.noItems')} />}
          {transfer.items.map((item) => (
            <TableRow key={item.id} className="border-b border-hairline-silver/40">
              <TableCell className="text-xs font-medium text-ink">{item.productModel.name}</TableCell>
              <TableCell className="text-xs text-slate">{item.identifiers[0]?.value ?? `#${item.id}`}</TableCell>
              <TableCell><ItemStatusBadge status={item.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** The moved accessory quantities table. */
function TransferAccessoriesTable({ transfer }: { transfer: Transfer }) {
  const { t } = useTranslation();
  if (transfer.accessories.length === 0) return null;
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('transfers.model')}</TableHead>
            <TableHead>{t('transfers.quantity')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfer.accessories.map((a) => (
            <TableRow key={a.productModel.id} className="border-b border-hairline-silver/40">
              <TableCell className="text-xs font-medium text-ink">{a.productModel.name}</TableCell>
              <TableCell className="text-xs text-ink">{a.quantity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Transfer detail: header, moved devices and moved accessory quantities. */
export function TransferDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const transferId = Number(id);
  const { data: transfer, isLoading } = useTransfer(Number.isNaN(transferId) ? 0 : transferId);

  if (isLoading) return <div className="text-xs text-slate">{t('common.loading')}</div>;
  if (!transfer) {
    return (
      <div className="space-y-4">
        <BackLink to="/transfers" label={t('transfers.backToList')} />
        <div className="text-xs text-slate">{t('transfers.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BackLink to="/transfers" label={t('transfers.backToList')} />
      <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
        {t('transfers.transferN', { id: transfer.id })}
      </h1>
      <TransferHeader transfer={transfer} />
      <TransferItemsTable transfer={transfer} />
      <TransferAccessoriesTable transfer={transfer} />
    </div>
  );
}
