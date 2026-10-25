import { useTranslation } from 'react-i18next';
import {
  Table, TableBody, TableHead, TableHeader, TableRow, TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import type { PartnerTransaction } from '@/entities/partner';
import { TransactionRow } from './TransactionRow';

const COLUMNS = 6;

interface TransactionsTableProps {
  transactions: PartnerTransaction[];
  isLoading: boolean;
}

/** Partner transactions feed table with loading and empty states. */
export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
          <TableHead>{t('ledger.date')}</TableHead>
          <TableHead>{t('ledger.type')}</TableHead>
          <TableHead>{t('consign.partner')}</TableHead>
          <TableHead>{t('partners.txItem')}</TableHead>
          <TableHead>{t('partners.txUser')}</TableHead>
          <TableHead className="text-right">{t('ledger.amount')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <TableLoadingRow colSpan={COLUMNS} />}
        {!isLoading && transactions.length === 0 && (
          <TableEmptyRow colSpan={COLUMNS} message={t('partners.noTransactions')} />
        )}
        {!isLoading && transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
      </TableBody>
    </Table>
  );
}
