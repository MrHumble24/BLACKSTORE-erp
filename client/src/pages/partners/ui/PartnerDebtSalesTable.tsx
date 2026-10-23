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
import type { SaleSummary } from '@/entities/sale';

interface PartnerDebtSalesTableProps {
  sales: SaleSummary[];
  onPay: (sale: SaleSummary) => void;
}

interface DebtRowProps {
  sale: SaleSummary;
  canPay: boolean;
  onPay: (sale: SaleSummary) => void;
}

function DebtRow({ sale, canPay, onPay }: DebtRowProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <TableRow
      onClick={() => navigate(`/sales/${sale.id}`)}
      className="cursor-pointer hover:bg-control-gray/40 transition-colors"
    >
      <TableCell className="font-mono text-xs text-ink font-medium">#{sale.id}</TableCell>
      <TableCell className="text-xs text-slate">{formatDate(sale.createdAt)}</TableCell>
      <TableCell className="text-right font-mono text-xs">{formatMoney(sale.total)}</TableCell>
      <TableCell className="text-right font-mono text-xs text-slate">{formatMoney(sale.paid)}</TableCell>
      <TableCell className="text-right font-mono text-xs font-semibold text-launch-orange">
        {formatMoney(sale.balance)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        {canPay && (
          <Button size="sm" onClick={() => onPay(sale)} className="h-7 text-xs gap-1">
            <CreditCard className="h-3 w-3" />
            {t('customers.payDebt')}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

/** Debt sales ledger for partner unpaid consignment sales with record payment action. */
export function PartnerDebtSalesTable({ sales, onPay }: PartnerDebtSalesTableProps) {
  const { t } = useTranslation();
  const canPay = useAuthStore((s) => s.hasPermission('record_payment'));

  if (sales.length === 0) {
    return (
      <Card className="border-hairline-silver/70 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
          <CardTitle className="text-sm font-semibold">{t('partners.unpaidSales')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-slate">
          {t('partners.noUnpaidSales')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('partners.unpaidSales')}</CardTitle>
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
              <TableHead className="w-24 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <DebtRow key={sale.id} sale={sale} canPay={canPay} onPay={onPay} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
