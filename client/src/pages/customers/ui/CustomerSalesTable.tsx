import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
} from '@/shared/ui';
import { formatMoney, formatDate } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { SaleStatusBadge, type SaleSummary } from '@/entities/sale';

interface CustomerSalesTableRowProps {
  sale: SaleSummary;
  canRecordPayment: boolean;
  onPay: (sale: SaleSummary) => void;
}

function CustomerSalesTableRow({ sale, canRecordPayment, onPay }: CustomerSalesTableRowProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDebt = Number(sale.balance) > 0;

  return (
    <TableRow
      onClick={() => navigate(`/sales/${sale.id}`)}
      className="cursor-pointer hover:bg-control-gray/40 transition-colors"
    >
      <TableCell className="font-mono font-medium text-xs text-ink">#{sale.id}</TableCell>
      <TableCell className="text-xs text-slate">{formatDate(sale.createdAt, true)}</TableCell>
      <TableCell className="text-right font-mono text-xs">{formatMoney(sale.total)}</TableCell>
      <TableCell className="text-right font-mono text-xs text-slate">{formatMoney(sale.paid)}</TableCell>
      <TableCell className="text-right font-mono text-xs font-semibold">
        <span className={isDebt ? 'text-launch-orange' : ''}>{formatMoney(sale.balance)}</span>
      </TableCell>
      <TableCell className="text-center">
        <SaleStatusBadge status={sale.status} />
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        {sale.status === 'DEBT' && canRecordPayment && (
          <Button size="sm" onClick={() => onPay(sale)} className="h-7 text-xs gap-1">
            <CreditCard className="h-3 w-3" />
            {t('customers.payDebt')}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function CustomerSalesTableEmpty() {
  const { t } = useTranslation();
  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('customers.salesHistory')}</CardTitle>
      </CardHeader>
      <CardContent className="p-8 text-center text-xs text-slate">
        {t('sales.noSales')}
      </CardContent>
    </Card>
  );
}

interface CustomerSalesTableProps {
  sales: SaleSummary[];
  onPay: (sale: SaleSummary) => void;
}

/** Purchase ledger table on customer details profile with pay debt action. */
export function CustomerSalesTable({ sales, onPay }: CustomerSalesTableProps) {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canRecordPayment = hasPermission('record_payment');

  if (sales.length === 0) {
    return <CustomerSalesTableEmpty />;
  }

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('customers.salesHistory')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-control-gray/30 text-[11px]">
              <TableHead className="w-20">{t('sales.number')}</TableHead>
              <TableHead>{t('sales.date')}</TableHead>
              <TableHead className="text-right">{t('sales.total')}</TableHead>
              <TableHead className="text-right">{t('sales.paid')}</TableHead>
              <TableHead className="text-right">{t('sales.balance')}</TableHead>
              <TableHead className="text-center w-28">{t('sales.filterStatus')}</TableHead>
              <TableHead className="w-24 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <CustomerSalesTableRow
                key={s.id}
                sale={s}
                canRecordPayment={canRecordPayment}
                onPay={onPay}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
