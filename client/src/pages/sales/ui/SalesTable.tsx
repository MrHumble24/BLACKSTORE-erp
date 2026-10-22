import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableLoadingRow,
  TableEmptyRow,
} from '@/shared/ui';
import { formatMoney, formatDate } from '@/shared/lib';
import { SaleStatusBadge, type SaleSummary } from '@/entities/sale';

interface SalesTableRowProps {
  sale: SaleSummary;
}

function SalesTableRow({ sale }: SalesTableRowProps) {
  const navigate = useNavigate();
  const isDebt = Number(sale.balance) > 0;

  return (
    <TableRow
      onClick={() => navigate(`/sales/${sale.id}`)}
      className="cursor-pointer hover:bg-control-gray/40 transition-colors"
    >
      <TableCell className="font-mono font-medium text-ink">#{sale.id}</TableCell>
      <TableCell className="text-xs text-slate whitespace-nowrap">
        {formatDate(sale.createdAt, true)}
      </TableCell>
      <TableCell className="text-xs font-medium text-ink">
        {sale.customer ? (
          <div>
            <span>{sale.customer.name}</span>
            <span className="text-[11px] text-slate block">{sale.customer.phone}</span>
          </div>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="text-xs text-slate">{sale.location.name}</TableCell>
      <TableCell className="text-xs text-slate">{sale.seller.name}</TableCell>
      <TableCell className="text-center font-mono text-xs">{sale.itemCount}</TableCell>
      <TableCell className="text-right font-mono font-medium text-xs">
        {formatMoney(sale.total)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate">
        {formatMoney(sale.paid)}
      </TableCell>
      <TableCell className="text-right font-mono font-semibold text-xs">
        <span className={isDebt ? 'text-launch-orange' : ''}>{formatMoney(sale.balance)}</span>
      </TableCell>
      <TableCell className="text-center">
        <SaleStatusBadge status={sale.status} />
      </TableCell>
    </TableRow>
  );
}

interface SalesTableProps {
  sales: SaleSummary[];
  isLoading: boolean;
}

/** Table rendering list of sales with click navigation to details. */
export function SalesTable({ sales, isLoading }: SalesTableProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-control-gray/30 text-[11px]">
            <TableHead className="w-24">{t('sales.number')}</TableHead>
            <TableHead>{t('sales.date')}</TableHead>
            <TableHead>{t('sales.customer')}</TableHead>
            <TableHead>{t('sales.location')}</TableHead>
            <TableHead>{t('sales.seller')}</TableHead>
            <TableHead className="text-center">{t('sales.items')}</TableHead>
            <TableHead className="text-right">{t('sales.total')}</TableHead>
            <TableHead className="text-right">{t('sales.paid')}</TableHead>
            <TableHead className="text-right">{t('sales.balance')}</TableHead>
            <TableHead className="text-center w-28">{t('sales.filterStatus')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingRow colSpan={10} />
          ) : sales.length === 0 ? (
            <TableEmptyRow colSpan={10} message={t('sales.noSales')} />
          ) : (
            sales.map((sale) => <SalesTableRow key={sale.id} sale={sale} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}
