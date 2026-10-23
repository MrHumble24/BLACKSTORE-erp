import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui';
import type { ImportError, ImportResult } from '@/entities/stock-import';

/** The skipped spreadsheet rows, each with its 1-based Excel row number (FR-7). */
function ImportErrorsTable({ errors }: { errors: ImportError[] }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-hairline-silver/70 overflow-hidden">
      <p className="px-4 py-2 text-[11px] font-medium text-slate">{t('importStock.errorsTitle')}</p>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('importStock.row')}</TableHead>
            <TableHead>{t('importStock.message')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.map((error) => (
            <TableRow key={`${error.row}-${error.message}`} className="border-b border-hairline-silver/40">
              <TableCell className="text-xs text-slate">{error.row}</TableCell>
              <TableCell className="text-xs text-ink">{error.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Import result card: how many items were created and which rows were skipped. */
export function ImportResultCard({ result }: { result: ImportResult }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-5 space-y-4 shadow-none">
      <p className="text-xs font-medium text-ink">{t('importStock.created', { count: result.created })}</p>
      {result.errors.length > 0 && <ImportErrorsTable errors={result.errors} />}
    </div>
  );
}
