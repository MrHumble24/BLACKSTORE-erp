import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, TableCell, TableRow } from '@/shared/ui';
import { formatDateTime, formatMoney } from '@/shared/lib';
import type { PartnerTransaction, PartnerTransactionKind } from '@/entities/partner';

/** Label key and badge colours for each transaction kind. */
const KIND_STYLE: Record<PartnerTransactionKind, { labelKey: string; className: string }> = {
  HANDOVER: { labelKey: 'partners.kindHandover', className: 'border-apple-blue/20 bg-apple-blue/10 text-apple-blue' },
  SOLD: { labelKey: 'partners.kindSold', className: 'border-hairline-silver bg-control-gray text-ink' },
  RETURNED: { labelKey: 'partners.kindReturned', className: 'border-hairline-silver bg-gallery-white text-slate' },
  PAYMENT: {
    labelKey: 'partners.kindPayment',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  REFUND: { labelKey: 'partners.kindRefund', className: 'border-launch-orange/20 bg-launch-orange/10 text-launch-orange' },
};

/** Amount with the payment method for payments and a link to the sale when there is one. */
function AmountCell({ tx }: { tx: PartnerTransaction }) {
  const { t } = useTranslation();
  return (
    <TableCell className="text-right text-xs whitespace-nowrap">
      <span className="font-mono font-medium text-ink">{formatMoney(tx.amount)}</span>
      {tx.method && (
        <span className="ml-1.5 text-slate">
          {tx.method === 'CASH' ? t('sales.methodCash') : t('sales.methodCard')}
        </span>
      )}
      {tx.saleId && (
        <Link to={`/sales/${tx.saleId}`} className="ml-1.5 font-mono font-semibold text-ink hover:underline">
          #{tx.saleId}
        </Link>
      )}
    </TableCell>
  );
}

/** One feed row: date, kind badge, partner link, item (or × count), user, amount. */
export function TransactionRow({ tx }: { tx: PartnerTransaction }) {
  const { t } = useTranslation();
  const kind = KIND_STYLE[tx.kind];
  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="text-xs text-slate whitespace-nowrap">{formatDateTime(tx.date)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`px-2.5 py-0.5 text-[11px] ${kind.className}`}>{t(kind.labelKey)}</Badge>
      </TableCell>
      <TableCell className="text-xs">
        <Link to={`/partners/${tx.partner.id}`} className="font-medium text-ink hover:underline">
          {tx.partner.name}
        </Link>
      </TableCell>
      <TableCell className="text-xs text-ink">
        {tx.kind === 'HANDOVER' ? <span className="font-mono">× {tx.count}</span> : (tx.item ?? '—')}
      </TableCell>
      <TableCell className="text-xs text-slate">{tx.user?.name ?? '—'}</TableCell>
      <AmountCell tx={tx} />
    </TableRow>
  );
}
