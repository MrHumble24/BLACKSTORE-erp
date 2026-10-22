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
import { formatDate } from '@/shared/lib';
import type { Customer } from '@/entities/customer';

interface CustomersTableProps {
  customers: Customer[];
  isLoading: boolean;
}

/** Table rendering customer list with click navigation to details. */
export function CustomersTable({ customers, isLoading }: CustomersTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-control-gray/30 text-[11px]">
            <TableHead>{t('customers.name')}</TableHead>
            <TableHead>{t('customers.phone')}</TableHead>
            <TableHead>{t('customers.note')}</TableHead>
            <TableHead>{t('customers.createdAt')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingRow colSpan={4} />
          ) : customers.length === 0 ? (
            <TableEmptyRow colSpan={4} message={t('customers.noCustomers')} />
          ) : (
            customers.map((c) => (
              <TableRow
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className="cursor-pointer hover:bg-control-gray/40 transition-colors"
              >
                <TableCell className="font-medium text-ink text-xs">{c.name}</TableCell>
                <TableCell className="font-mono text-xs text-slate">{c.phone}</TableCell>
                <TableCell className="text-xs text-slate">{c.note || '—'}</TableCell>
                <TableCell className="text-xs text-slate">{formatDate(c.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
