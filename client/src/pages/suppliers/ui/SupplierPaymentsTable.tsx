import { useTranslation } from 'react-i18next';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { SupplierPayment } from '@/entities/supplier';

interface SupplierPaymentsTableProps {
  payments: SupplierPayment[];
  isLoading: boolean;
}

/** One payment row: amount may be negative for a correcting entry. */
function PaymentRow({ payment }: { payment: SupplierPayment }) {
  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="text-xs text-slate">{payment.date.slice(0, 10)}</TableCell>
      <TableCell className="text-xs font-medium text-ink">{formatMoney(payment.amount)}</TableCell>
      <TableCell className="text-xs text-ink">{formatMoney(payment.fee)}</TableCell>
      <TableCell className="text-xs text-slate">{payment.note ?? '—'}</TableCell>
    </TableRow>
  );
}

/** Supplier payments history: date, amount, transfer fee, note (manage_suppliers). */
export function SupplierPaymentsTable({ payments, isLoading }: SupplierPaymentsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('suppliers.date')}</TableHead>
            <TableHead>{t('suppliers.amount')}</TableHead>
            <TableHead>{t('suppliers.fee')}</TableHead>
            <TableHead>{t('suppliers.note')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={4} />}
          {!isLoading && payments.length === 0 && (
            <TableEmptyRow colSpan={4} message={t('suppliers.noPayments')} />
          )}
          {!isLoading && payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
