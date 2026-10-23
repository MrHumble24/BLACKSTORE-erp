import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { InvestorReport, InvestorReportRow } from '@/entities/report';
import { ReportHeadCell } from './ReportHeadCell';

function InvestorRow({ row }: { row: InvestorReportRow }) {
  const { t } = useTranslation();
  return (
    <TableRow className="text-[13px]">
      <TableCell className="py-3 px-6 font-medium text-ink">
        {row.investor.name}
        {row.investor.isOwn && (
          <span className="ml-1.5 text-[11px] font-normal text-steel">
            ({t('investors.ownCapital')})
          </span>
        )}
      </TableCell>
      <TableCell className="py-3 px-6 text-right tabular-nums text-steel">{row.itemsSold}</TableCell>
      <TableCell className="py-3 px-6 text-right font-medium tabular-nums text-ink">{formatMoney(row.sales)}</TableCell>
      <TableCell className="py-3 px-6 text-right font-semibold tabular-nums text-emerald-600">
        {formatMoney(row.profit)}
      </TableCell>
      <TableCell className="py-3 px-6 text-right tabular-nums text-slate">{formatMoney(row.investorShare)}</TableCell>
      <TableCell className="py-3 px-6 text-right tabular-nums text-slate">{formatMoney(row.businessShare)}</TableCell>
    </TableRow>
  );
}

function InvestorTotalsRow({ totals }: { totals: Omit<InvestorReportRow, 'investor'> }) {
  const { t } = useTranslation();
  return (
    <TableFooter className="bg-studio-mist/60 text-[13px] border-t border-hairline-silver/60">
      <TableRow className="hover:bg-transparent">
        <TableCell className="py-3 px-6 font-semibold text-ink">{t('reports.totals')}</TableCell>
        <TableCell className="py-3 px-6 text-right font-medium tabular-nums text-ink">{totals.itemsSold}</TableCell>
        <TableCell className="py-3 px-6 text-right font-semibold tabular-nums text-ink">{formatMoney(totals.sales)}</TableCell>
        <TableCell className="py-3 px-6 text-right font-semibold tabular-nums text-emerald-600">
          {formatMoney(totals.profit)}
        </TableCell>
        <TableCell className="py-3 px-6 text-right font-medium tabular-nums text-ink">{formatMoney(totals.investorShare)}</TableCell>
        <TableCell className="py-3 px-6 text-right font-medium tabular-nums text-ink">{formatMoney(totals.businessShare)}</TableCell>
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
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{t('reports.investorBreakdown')}</h3>
      </div>
      <div className="overflow-x-auto border-t border-hairline-silver/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <ReportHeadCell label={t('reports.investor')} className="py-2.5 px-6" />
              <ReportHeadCell label={t('reports.itemsSold')} className="text-right" />
              <ReportHeadCell label={t('reports.sales')} className="text-right" />
              {canViewCost && <ReportHeadCell label={t('reports.cost')} className="text-right" />}
              <ReportHeadCell label={t('reports.profit')} className="text-right" />
              <ReportHeadCell label={t('reports.investorShare')} className="text-right" />
              <ReportHeadCell label={t('reports.businessShare')} className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={canViewCost ? 7 : 6}
                  className="py-8 text-center text-[13px] text-steel"
                >
                  {t('reports.noInvestorData')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => <InvestorRow key={row.investor.id} row={row} />)
            )}
          </TableBody>
          {rows.length > 0 && <InvestorTotalsRow totals={totals} />}
        </Table>
      </div>
    </Card>
  );
}
