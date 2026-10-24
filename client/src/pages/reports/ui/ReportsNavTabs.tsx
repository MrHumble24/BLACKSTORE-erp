import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users } from 'lucide-react';
import { cn } from '@/shared/lib';

/** Top navigation tabs switching between Profit Report and Investor Report. */
export function ReportsNavTabs() {
  const { t } = useTranslation();

  const tabs = [
    {
      to: '/reports/profit',
      label: t('reports.profitReport'),
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      to: '/reports/investors',
      label: t('reports.investorReport'),
      icon: <Users className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-tight transition-colors',
              isActive
                ? 'bg-ink text-white dark:bg-control-gray dark:text-ink shadow-sm'
                : 'text-slate hover:bg-control-gray/60 hover:text-ink',
            )
          }
        >
          {tab.icon}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
