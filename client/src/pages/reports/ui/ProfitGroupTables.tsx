import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, MapPin, Users } from 'lucide-react';
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/shared/ui';
import { cn, formatMoney } from '@/shared/lib';
import type { ProfitGroup } from '@/entities/report';
import { ReportHeadCell } from './ReportHeadCell';

type GroupTab = 'category' | 'location' | 'investor';

function GroupRow({ group }: { group: ProfitGroup }) {
  const { t } = useTranslation();
  return (
    <TableRow className="text-[13px]">
      <TableCell className="py-3 px-6 font-medium text-ink">{group.name || t('reports.accessories')}</TableCell>
      <TableCell className="py-3 px-6 text-center tabular-nums text-steel">{group.quantity}</TableCell>
      <TableCell className="py-3 px-6 text-right font-medium tabular-nums text-ink">{formatMoney(group.sales)}</TableCell>
      <TableCell className="py-3 px-6 text-right font-semibold tabular-nums text-emerald-600">
        {formatMoney(group.profit)}
      </TableCell>
      <TableCell className="py-3 px-6 text-right tabular-nums text-slate">{formatMoney(group.investorShare)}</TableCell>
      <TableCell className="py-3 px-6 text-right tabular-nums text-slate">{formatMoney(group.businessShare)}</TableCell>
    </TableRow>
  );
}

function GroupTable({ groups }: { groups: ProfitGroup[] }) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <ReportHeadCell label={t('reports.name')} className="py-2.5 px-6" />
          <ReportHeadCell label={t('reports.qty')} className="py-2.5 px-6 text-center" />
          <ReportHeadCell label={t('reports.sales')} className="py-2.5 px-6 text-right" />
          <ReportHeadCell label={t('reports.profit')} className="py-2.5 px-6 text-right" />
          <ReportHeadCell label={t('reports.investorShare')} className="py-2.5 px-6 text-right" />
          <ReportHeadCell label={t('reports.businessShare')} className="py-2.5 px-6 text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={6} className="py-8 text-center text-[13px] text-steel">
              {t('reports.noGroupData')}
            </TableCell>
          </TableRow>
        ) : (
          groups.map((g) => <GroupRow key={g.id} group={g} />)
        )}
      </TableBody>
    </Table>
  );
}

interface ProfitGroupTablesProps {
  byInvestor: ProfitGroup[];
  byLocation: ProfitGroup[];
  byCategory: ProfitGroup[];
}

/** Performance breakdown card with segmented tabs for category, location and investor views. */
export function ProfitGroupTables({ byInvestor, byLocation, byCategory }: ProfitGroupTablesProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<GroupTab>('category');

  const tabs = [
    { id: 'category' as const, label: t('reports.byCategory'), icon: Layers, data: byCategory },
    { id: 'location' as const, label: t('reports.byLocation'), icon: MapPin, data: byLocation },
    { id: 'investor' as const, label: t('reports.byInvestor'), icon: Users, data: byInvestor },
  ];

  const current = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {t('reports.breakdowns', 'Performance Breakdown')}
        </h3>
        <div className="inline-flex items-center gap-1 self-start rounded-full bg-studio-mist p-1 sm:self-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  isActive ? 'bg-gallery-white text-ink shadow-xs' : 'text-slate hover:text-ink',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span className="tabular-nums text-[10px] text-steel">({tab.data.length})</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto border-t border-hairline-silver/50">
        <div className="max-h-72 overflow-y-auto">
          <GroupTable groups={current.data} />
        </div>
      </div>
    </Card>
  );
}
