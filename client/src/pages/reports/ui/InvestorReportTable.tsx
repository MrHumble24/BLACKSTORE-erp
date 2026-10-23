import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { InvestorReport, InvestorReportRow } from '@/entities/report';

interface InvestorRowProps {
  row: InvestorReportRow;
  canViewCost: boolean;
}

function InvestorRow({ row, canViewCost }: InvestorRowProps) {
  const { t } = useTranslation();
  return (
    <TableRow className="text-xs">
      <TableCell className="font-medium text-ink">
        {row.investor.name}
        {row.investor.isOwn && (
          <span className="ml-1.5 text-[10px] text-slate font-normal">
            ({t('investors.ownCapital')})
          </span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-slate">{row.itemsSold}</TableCell>
      <TableCell className="text-right font-mono">{formatMoney(row.sales)}</TableCell>
      {canViewCost && (
        <TableCell className="text-right font-mono text-slate">{formatMoney(row.cost)}</TableCell>
      )}
      <TableCell className="text-right font-mono font-medium">{formatMoney(row.profit)}</TableCell>
      <TableCell className="text-right font-mono text-slate">
        {formatMoney(row.investorShare)}
      </TableCell>
      <TableCell className="text-right font-mono text-slate">
        {formatMoney(row.businessShare)}
      </TableCell>
    </TableRow>
  );
}

interface InvestorTotalsFooterProps {
  totals: Omit<InvestorReportRow, 'investor'>;
  canViewCost: boolean;
}

function InvestorTotalsFooter({ totals, canViewCost }: InvestorTotalsFooterProps) {
  const { t } = useTranslation();
  return (
    <TableFooter className="bg-control-gray/20 font-semibold text-xs border-t-2 border-hairline-silver/80">
      <TableRow>
        <TableCell>{t('reports.totals')}</TableCell>
        <TableCell className="text-right font-mono">{totals.itemsSold}</TableCell>
        <TableCell className="text-right font-mono">{formatMoney(totals.sales)}</TableCell>
        {canViewCost && (
          <TableCell className="text-right font-mono">{formatMoney(totals.cost)}</TableCell>
        )}
        <TableCell className="text-right font-mono">{formatMoney(totals.profit)}</TableCell>
        <TableCell className="text-right font-mono">{formatMoney(totals.investorShare)}</TableCell>
        <TableCell className="text-right font-mono">{formatMoney(totals.businessShare)}</TableCell>
      </TableRow>
    </TableFooter>
  );
}

interface InvestorReportTableProps {
  report: InvestorReport;
  canViewCost: boolean;
}

/** Breakdown table of investor sales, cost, profit and shares with totals footer. */
export function InvestorReportTable({ report, canViewCost }: InvestorReportTableProps) {
  const { t } = useTranslation();
  const { rows, totals } = report;

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('reports.investorBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-control-gray/30 text-[11px]">
              <TableHead>{t('reports.investor')}</TableHead>
              <TableHead className="text-right">{t('reports.itemsSold')}</TableHead>
              <TableHead className="text-right">{t('reports.sales')}</TableHead>
              {canViewCost && <TableHead className="text-right">{t('reports.cost')}</TableHead>}
              <TableHead className="text-right">{t('reports.profit')}</TableHead>
              <TableHead className="text-right">{t('reports.investorShare')}</TableHead>
              <TableHead className="text-right">{t('reports.businessShare')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canViewCost ? 7 : 6}
                  className="text-center py-8 text-xs text-slate"
                >
                  {t('reports.noInvestorData')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <InvestorRow key={row.investor.id} row={row} canViewCost={canViewCost} />
              ))
            )}
          </TableBody>
          {rows.length > 0 && <InvestorTotalsFooter totals={totals} canViewCost={canViewCost} />}
        </Table>
      </CardContent>
    </Card>
  );
}
