import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib';
import type { ItemStatus } from '@/entities/item';

interface StatusTabItem {
  status?: ItemStatus;
  labelKey: string;
  dotColor: string;
}

const STATUS_TABS: StatusTabItem[] = [
  { status: undefined, labelKey: 'items.allStatuses', dotColor: 'bg-slate-400' },
  { status: 'IN_STOCK', labelKey: 'items.status.IN_STOCK', dotColor: 'bg-emerald-500' },
  { status: 'AT_PARTNER', labelKey: 'items.status.AT_PARTNER', dotColor: 'bg-amber-500' },
  { status: 'SOLD', labelKey: 'items.status.SOLD', dotColor: 'bg-slate-500' },
  { status: 'DEBT', labelKey: 'items.status.DEBT', dotColor: 'bg-sky-500' },
  { status: 'DEFECTIVE', labelKey: 'items.status.DEFECTIVE', dotColor: 'bg-rose-500' },
];

interface ItemsStatusTabsProps {
  currentStatus?: ItemStatus;
  onChange: (status?: ItemStatus) => void;
}

/** Horizontal segmented quick-filter pills for device statuses. */
export function ItemsStatusTabs({ currentStatus, onChange }: ItemsStatusTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {STATUS_TABS.map((tab) => {
        const isActive = currentStatus === tab.status;
        return (
          <button
            key={tab.status ?? 'ALL'}
            type="button"
            onClick={() => onChange(tab.status)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer shrink-0',
              isActive
                ? 'bg-ink text-white dark:bg-white dark:text-black shadow-sm'
                : 'bg-gallery-white border border-hairline-silver/70 text-slate hover:text-ink hover:bg-studio-mist/80 dark:bg-white/[0.03]',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full transition-opacity',
                tab.dotColor,
                isActive ? 'opacity-100 ring-2 ring-white/30 dark:ring-black/30' : 'opacity-70',
              )}
            />
            <span>{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
