import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import {
  Button,
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
} from '@/shared/ui';
import { formatMoney, formatDate } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import type { Sale } from '@/entities/sale';

interface SalePaymentsCardProps {
  sale: Sale;
  onAddPayment: () => void;
}

function SalePaymentsCard({ sale, onAddPayment }: SalePaymentsCardProps) {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canAddPayment = sale.status === 'DEBT' && hasPermission('record_payment');

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">{t('sales.paymentsTitle')}</CardTitle>
        {canAddPayment && (
          <Button size="sm" onClick={onAddPayment} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            {t('sales.addPayment')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {sale.payments.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate">{t('sales.noPayments')}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-control-gray/30 text-[11px]">
                <TableHead>{t('sales.date')}</TableHead>
                <TableHead className="text-right">{t('paymentDialog.amount')}</TableHead>
                <TableHead>{t('sales.method')}</TableHead>
                <TableHead>{t('sales.receivedBy')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs text-slate">{formatDate(p.date, true)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-ink">
                    {formatMoney(p.amount)}
                  </TableCell>
                  <TableCell className="text-xs text-slate">
                    {p.method === 'CASH' ? t('sales.methodCash') : t('sales.methodCard')}
                  </TableCell>
                  <TableCell className="text-xs text-slate">{p.receivedBy.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

interface SaleReturnsCardProps {
  returns: Sale['returns'];
}

function SaleReturnsCard({ returns }: SaleReturnsCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('sales.returnsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {returns.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate">{t('sales.noReturns')}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-control-gray/30 text-[11px]">
                <TableHead>{t('sales.date')}</TableHead>
                <TableHead className="text-center">{t('sell.tableQty')}</TableHead>
                <TableHead className="text-right">{t('returnDialog.refundAmount')}</TableHead>
                <TableHead>{t('returnDialog.result')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-slate">{formatDate(r.date, true)}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{r.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-launch-orange">
                    -{formatMoney(r.refundAmount)}
                  </TableCell>
                  <TableCell className="text-xs text-slate">
                    {r.result === 'BACK_TO_STOCK'
                      ? t('sales.resultBackToStock')
                      : t('sales.resultDefective')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

interface SaleLedgerCardsProps {
  sale: Sale;
  onAddPayment: () => void;
}

/** Side-by-side ledger cards for payments history and returns history. */
export function SaleLedgerCards({ sale, onAddPayment }: SaleLedgerCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SalePaymentsCard sale={sale} onAddPayment={onAddPayment} />
      <SaleReturnsCard returns={sale.returns} />
    </div>
  );
}
