import { useTranslation } from 'react-i18next';
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
  TableLoadingRow, TableEmptyRow, TablePagination,
} from '@/shared/ui';
import type { AccountLine } from '@/entities/investor';
import { StatementRow } from './StatementRow';

interface InvestorStatementProps {
  lines: AccountLine[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

/** The account statement (F26): one row per line, newest first, with pagination. */
export function InvestorStatement({ lines, total, page, pageSize, isLoading, onPageChange }: InvestorStatementProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
              <TableHead className="w-28">{t('investors.date')}</TableHead>
              <TableHead>{t('investors.note')}</TableHead>
              <TableHead className="text-right">{t('investors.amount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoadingRow colSpan={3} />}
            {!isLoading && lines.length === 0 && (
              <TableEmptyRow colSpan={3} message={t('investors.account.empty')} />
            )}
            {!isLoading && lines.map((line) => <StatementRow key={line.id} line={line} />)}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        page={page}
        totalPages={Math.ceil(total / pageSize) || 1}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
