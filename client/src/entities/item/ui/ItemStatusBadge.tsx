import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { ItemStatus } from '../model/types';

interface ItemStatusBadgeProps {
  status: ItemStatus;
  className?: string;
}

const statusStyles: Record<ItemStatus, { pill: string; dot?: string }> = {
  IN_STOCK: {
    pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium',
    dot: 'bg-emerald-500',
  },
  AT_PARTNER: {
    pill: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-medium',
    dot: 'bg-blue-500',
  },
  DEBT: {
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-medium',
    dot: 'bg-amber-500',
  },
  SOLD: {
    pill: 'bg-control-gray text-slate border-hairline-silver/60 font-normal',
  },
  RETURNED: {
    pill: 'bg-control-gray text-slate border-hairline-silver/60 font-normal',
  },
  DEFECTIVE: {
    pill: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium',
    dot: 'bg-rose-500',
  },
};

/**
 * Modern ERP-styled status badge with distinct semantic tokens and status indicator dot.
 */
export function ItemStatusBadge({ status, className }: ItemStatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusStyles[status];

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] rounded-full whitespace-nowrap tracking-[-0.01em] ${config.pill} ${className ?? ''}`}
    >
      {config.dot && (
        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 shrink-0 ${config.dot}`} />
      )}
      <span>{t(`items.status.${status}`)}</span>
    </Badge>
  );
}
