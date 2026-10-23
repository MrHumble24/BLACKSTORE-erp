import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/shared/ui';
import { cn, formatMoney, formatDate } from '@/shared/lib';
import type { ProfitLine } from '@/entities/report';
import type { ReactNode } from 'react';
import { ReportHeadCell } from './ReportHeadCell';

function LinesTableHeader({ canViewCost }: { canViewCost: boolean }) {
  const { t } = useTranslation();
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <ReportHeadCell label={t('reports.date')} className="py-2.5 px-6" />
        <ReportHeadCell label={t('reports.kind')} className="text-center" />
        <ReportHeadCell label={t('reports.itemOrModel')} />
        <ReportHeadCell label={t('reports.investor')} />
        <ReportHeadCell label={t('reports.location')} />
        <ReportHeadCell label={t('reports.category')} />
        <ReportHeadCell label={t('reports.salePrice')} className="whitespace-nowrap text-right" />
        <ReportHeadCell label={t('reports.refunded')} className="whitespace-nowrap text-right" />
        {canViewCost && <ReportHeadCell label={t('reports.cost')} className="whitespace-nowrap text-right" />}
        <ReportHeadCell label={t('reports.profit')} className="whitespace-nowrap text-right" />
        <ReportHeadCell label={t('reports.investorShare')} className="whitespace-nowrap text-right" />
        <ReportHeadCell label={t('reports.businessShare')} className="whitespace-nowrap text-right" />
      </TableRow>
    </TableHeader>
  );
}

/** Small self-contained pill for the line type (sale vs return). */
function KindBadge({ isReturn, label }: { isReturn: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
        isReturn ? 'bg-destructive/10 text-destructive' : 'bg-apple-blue/10 text-apple-blue',
      )}
    >
      {label}
    </span>
  );
}

/** Money cell keeps static columns quiet; only the result column carries semantics. */
function MoneyCell({ value, className }: { value: string; className?: string }) {
  return (
    <TableCell
      className={cn('py-3 px-6 text-right font-medium tabular-nums tracking-[-0.01em] text-ink', className)}
    >
      {value}
    </TableCell>
  );
}

function QuietCell({ children, className }: { children: ReactNode; className?: string }) {
  return <TableCell className={cn('py-3 px-6 text-[13px] text-slate', className)}>{children}</TableCell>;
}

interface ProfitLineRowProps {
  line: ProfitLine;
  canViewCost: boolean;
}

function ProfitLineRow({ line, canViewCost }: ProfitLineRowProps) {
  const { t } = useTranslation();
  const isReturn = line.kind === 'RETURN';
  const itemName = line.item ? `${line.productModel} (${line.item.code})` : line.productModel;

  return (
    <TableRow className="text-[13px]">
      <QuietCell className="whitespace-nowrap">{formatDate(line.profitDate)}</QuietCell>
      <TableCell className="py-3 text-center">
        <KindBadge isReturn={isReturn} label={t(`reports.kinds.${line.kind}`)} />
      </TableCell>
      <TableCell className="max-w-[180px] truncate py-3 font-medium text-ink" title={itemName}>
        {itemName}
      </TableCell>
      <QuietCell className="truncate">{line.investor?.name ?? '—'}</QuietCell>
      <QuietCell className="max-w-[120px] truncate">{line.location.name}</QuietCell>
      <QuietCell className="max-w-[120px] truncate">{line.category.name}</QuietCell>
      <MoneyCell value={formatMoney(line.salePrice)} />
      <MoneyCell value={formatMoney(line.refunded)} className="font-normal text-slate" />
      {canViewCost && <MoneyCell value={formatMoney(line.cost)} className="font-normal text-slate" />}
      <MoneyCell value={formatMoney(line.profit)} className={isReturn ? 'text-destructive' : ''} />
      <MoneyCell value={formatMoney(line.investorShare)} className="font-normal text-slate" />
      <MoneyCell value={formatMoney(line.businessShare)} className="font-normal text-slate" />
    </TableRow>
  );
}

interface ProfitLinesTableProps {
  lines: ProfitLine[];
  canViewCost: boolean;
}

/** Detailed paginated table of profit lines from sales and returns. */
export function ProfitLinesTable({ lines, canViewCost }: ProfitLinesTableProps) {
  const { t } = useTranslation();

  if (lines.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-[13px] text-slate">{t('reports.noLines')}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{t('reports.detailedLines')}</h3>
      </div>
      <div className="overflow-x-auto border-t border-hairline-silver/50">
        <Table>
          <LinesTableHeader canViewCost={canViewCost} />
          <TableBody>
            {lines.map((line, idx) => (
              <ProfitLineRow
                key={`${line.saleId}-${line.saleItemId}-${line.returnId ?? idx}`}
                line={line}
                canViewCost={canViewCost}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
