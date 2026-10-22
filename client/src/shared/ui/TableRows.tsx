import { useTranslation } from 'react-i18next';
import { TableRow, TableCell } from './table';

/** Centered table row indicating data is loading. */
export function TableLoadingRow({ colSpan }: { colSpan: number }) {
  const { t } = useTranslation();
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-28 text-center text-xs text-slate">
        {t('common.loading')}
      </TableCell>
    </TableRow>
  );
}

/** Centered table row indicating empty state. */
export function TableEmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-28 text-center text-xs text-slate">
        {message}
      </TableCell>
    </TableRow>
  );
}
