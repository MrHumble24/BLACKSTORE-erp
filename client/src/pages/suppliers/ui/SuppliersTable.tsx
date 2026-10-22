import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import { SupplierActiveToggle, type SupplierSummary } from '@/entities/supplier';

interface SuppliersTableProps {
  suppliers: SupplierSummary[];
  isLoading: boolean;
}

/** Single row; the name links to the supplier detail page. */
function SupplierRow({ supplier }: { supplier: SupplierSummary }) {
  const { t } = useTranslation();

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell>
        <Link
          to={`/suppliers/${supplier.id}`}
          className="font-medium text-apple-blue underline-offset-4 hover:underline"
        >
          {supplier.name}
        </Link>
      </TableCell>
      <TableCell className="text-xs text-slate">{supplier.country ?? '—'}</TableCell>
      <TableCell>
        <Badge
          variant={supplier.isActive ? 'active' : 'destructive'}
          className="px-2.5 py-0.5 text-[11px]"
        >
          {supplier.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <SupplierActiveToggle supplier={supplier} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Suppliers table (name, country, status, enable/disable). Phone and note live on the
 * supplier detail page — the list endpoint returns the summary shape without contact data.
 */
export function SuppliersTable({ suppliers, isLoading }: SuppliersTableProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('suppliers.name')}</TableHead>
            <TableHead>{t('suppliers.country')}</TableHead>
            <TableHead>{t('suppliers.status')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={4} />}
          {!isLoading && suppliers.length === 0 && (
            <TableEmptyRow colSpan={4} message={t('suppliers.noSuppliers')} />
          )}
          {!isLoading && suppliers.map((supplier) => (
            <SupplierRow key={supplier.id} supplier={supplier} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
