import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { SaleStatus } from '../model/types';

interface SaleStatusBadgeProps {
  status: SaleStatus;
  className?: string;
}

const statusStyles: Record<SaleStatus, string> = {
  PAID: 'bg-ink text-white dark:bg-control-gray dark:text-ink border-0 font-medium',
  DEBT: 'bg-launch-orange/10 text-launch-orange border border-launch-orange/20 font-medium',
  RETURNED: 'bg-control-gray/60 text-slate border-0 font-normal',
};

/**
 * Status badge for sales: PAID, DEBT, or RETURNED.
 */
export function SaleStatusBadge({ status, className }: SaleStatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className={`px-2.5 py-0.5 text-[11px] rounded-full tracking-[-0.01em] ${statusStyles[status]} ${className ?? ''}`}
    >
      {t(`sales.status.${status}`)}
    </Badge>
  );
}
