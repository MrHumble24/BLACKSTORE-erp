import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { ProfitGroup } from '@/entities/report';

function GroupRow({ group }: { group: ProfitGroup }) {
  const { t } = useTranslation();
  return (
    <TableRow className="text-[11px]">
      <TableCell className="py-1 px-2 font-medium text-ink truncate max-w-[120px]">
        {group.name || t('reports.accessories')}
      </TableCell>
      <TableCell className="py-1 px-2 text-right font-mono text-slate">
        {group.quantity}
      </TableCell>
      <TableCell className="py-1 px-2 text-right font-mono">
        {formatMoney(group.sales)}
      </TableCell>
      <TableCell className="py-1 px-2 text-right font-mono font-medium">
        {formatMoney(group.profit)}
      </TableCell>
      <TableCell className="py-1 px-2 text-right font-mono text-slate">
        {formatMoney(group.investorShare)}
      </TableCell>
      <TableCell className="py-1 px-2 text-right font-mono text-slate">
        {formatMoney(group.businessShare)}
      </TableCell>
    </TableRow>
  );
}

interface GroupTableProps {
  title: string;
  groups: ProfitGroup[];
}

function SingleGroupTable({ title, groups }: GroupTableProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-2.5 px-3 border-b border-hairline-silver/60">
        <CardTitle className="text-xs font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 max-h-56 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-control-gray/30 text-[10px]">
              <TableHead className="py-1 px-2">{t('reports.name')}</TableHead>
              <TableHead className="py-1 px-2 text-right">{t('reports.qty')}</TableHead>
              <TableHead className="py-1 px-2 text-right">{t('reports.sales')}</TableHead>
              <TableHead className="py-1 px-2 text-right">{t('reports.profit')}</TableHead>
              <TableHead className="py-1 px-2 text-right">{t('reports.investorShare')}</TableHead>
              <TableHead className="py-1 px-2 text-right">{t('reports.businessShare')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-[11px] text-slate">
                  {t('reports.noGroupData')}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => <GroupRow key={g.id} group={g} />)
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface ProfitGroupTablesProps {
  byInvestor: ProfitGroup[];
  byLocation: ProfitGroup[];
  byCategory: ProfitGroup[];
}

/** Three summary group breakdown tables: by investor, by location, and by category. */
export function ProfitGroupTables({
  byInvestor,
  byLocation,
  byCategory,
}: ProfitGroupTablesProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SingleGroupTable title={t('reports.byInvestor')} groups={byInvestor} />
      <SingleGroupTable title={t('reports.byLocation')} groups={byLocation} />
      <SingleGroupTable title={t('reports.byCategory')} groups={byCategory} />
    </div>
  );
}
