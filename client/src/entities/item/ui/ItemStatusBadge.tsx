import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { ItemStatus } from '../model/types';

interface ItemStatusBadgeProps {
  status: ItemStatus;
  className?: string;
}

const statusStyles: Record<ItemStatus, { pill: string; dot?: string }> = {
  IN_STOCK: {
    pill: 'bg-emerald-50 text-emerald-800 border-emerald-200/70 font-medium',
    dot: 'bg-emerald-500',
  },
  AT_PARTNER: {
    pill: 'bg-blue-50 text-blue-700 border-blue-200/70 font-medium',
    dot: 'bg-blue-500',
  },
  DEBT: {
    pill: 'bg-amber-50 text-amber-800 border-amber-200/70 font-medium',
    dot: 'bg-amber-500',
  },
  SOLD: {
    pill: 'bg-zinc-100 text-zinc-600 border-zinc-200 font-normal',
  },
  RETURNED: {
    pill: 'bg-slate-100 text-slate-600 border-slate-200 font-normal',
  },
  DEFECTIVE: {
    pill: 'bg-rose-50 text-rose-700 border-rose-200/80 font-medium',
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
