import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  TableLoadingRow, TableEmptyRow, TablePagination,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import { useInvestorSupplierPayments, type InvestorSupplierPayment } from '@/entities/investor';
import { formatFee } from '@/entities/supplier';

const PAGE_SIZE = 20;

/** One payment: date, supplier link, amount, fee (marked "inv." when charged to the investor), note. */
function PaymentRow({ payment }: { payment: InvestorSupplierPayment }) {
  const { t } = useTranslation();
  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="text-xs text-slate">{payment.date.slice(0, 10)}</TableCell>
      <TableCell className="text-xs">
        <Link to={`/suppliers/${payment.supplier.id}`} className="text-ink font-medium hover:underline">
          {payment.supplier.name}
        </Link>
      </TableCell>
      <TableCell className="text-xs font-medium text-ink">{formatMoney(payment.amount)}</TableCell>
      <TableCell className="text-xs text-ink">{formatFee(payment.fee, payment.feePaidBy, t)}</TableCell>
      <TableCell className="text-xs text-slate max-w-[280px] truncate">{payment.note ?? '—'}</TableCell>
    </TableRow>
  );
}

/** Supplier payments made with this investor's money, newest first, with pagination (F25). */
export function InvestorSupplierPaymentsTable({ investorId }: { investorId: number }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvestorSupplierPayments(investorId, page, PAGE_SIZE);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold font-sf-pro-display text-ink tracking-tight">
        {t('investors.supplierPaymentsTitle')}
      </h2>
      <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
              <TableHead>{t('investors.date')}</TableHead>
              <TableHead>{t('investors.supplier')}</TableHead>
              <TableHead>{t('investors.amount')}</TableHead>
              <TableHead>{t('suppliers.fee')}</TableHead>
              <TableHead>{t('investors.note')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoadingRow colSpan={5} />}
            {!isLoading && items.length === 0 && (
              <TableEmptyRow colSpan={5} message={t('investors.noSupplierPayments')} />
            )}
            {!isLoading && items.map((p) => <PaymentRow key={p.id} payment={p} />)}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE) || 1}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
