import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  TableLoadingRow, TableEmptyRow, TablePagination,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import {
  useInvestorTransactions,
  type InvestorTransaction,
  type InvestorTxType,
} from '@/entities/investor';

const TRANSACTIONS_PAGE_SIZE = 20;

/** Translated label for a deposit/payout transaction type. */
function txTypeLabel(type: InvestorTxType, t: (k: string) => string): string {
  return type === 'PAYOUT' ? t('investors.payout') : t('investors.deposit');
}

/** Single transaction row: date, type, amount and note. */
function TransactionRow({ transaction }: { transaction: InvestorTransaction }) {
  const { t } = useTranslation();

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="text-xs text-slate">{transaction.date.slice(0, 10)}</TableCell>
      <TableCell
        className={
          transaction.type === 'PAYOUT'
            ? 'text-xs font-medium text-launch-orange'
            : 'text-xs font-medium text-ink'
        }
      >
        {txTypeLabel(transaction.type, t)}
      </TableCell>
      <TableCell className="text-xs font-medium text-ink">
        {formatMoney(transaction.amount)}
      </TableCell>
      <TableCell className="text-xs text-slate max-w-[280px] truncate">
        {transaction.note ?? '—'}
      </TableCell>
    </TableRow>
  );
}

interface InvestorTransactionsTableProps {
  transactions: InvestorTransaction[];
  isLoading: boolean;
}

/** History of money an investor put in or was paid back, newest first. */
export function InvestorTransactionsTable({
  transactions,
  isLoading,
}: InvestorTransactionsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('investors.date')}</TableHead>
            <TableHead>{t('investors.transactionType')}</TableHead>
            <TableHead>{t('investors.amount')}</TableHead>
            <TableHead>{t('investors.note')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={4} />}
          {!isLoading && transactions.length === 0 && (
            <TableEmptyRow colSpan={4} message={t('investors.noTransactions')} />
          )}
          {!isLoading && transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Deposits/withdrawals table with its own pagination (FR-10), used by both investor page variants. */
export function InvestorTransactionsSection({ investorId }: { investorId: number }) {
  const [page, setPage] = useState(1);
  const { data: txPage, isLoading } = useInvestorTransactions(investorId, page, TRANSACTIONS_PAGE_SIZE);
  const totalPages = Math.ceil((txPage?.total ?? 0) / TRANSACTIONS_PAGE_SIZE) || 1;

  return (
    <>
      <InvestorTransactionsTable transactions={txPage?.items ?? []} isLoading={isLoading} />
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={txPage?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}
