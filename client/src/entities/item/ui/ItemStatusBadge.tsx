import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { ItemStatus } from '../model/types';

interface ItemStatusBadgeProps {
  status: ItemStatus;
  className?: string;
}

const statusStyles: Record<ItemStatus, string> = {
  IN_STOCK: 'bg-control-gray text-ink border-0 font-medium',
  AT_PARTNER: 'bg-apple-blue/10 text-apple-blue border border-apple-blue/20 font-medium',
  DEBT: 'bg-launch-orange/10 text-launch-orange border border-launch-orange/20 font-medium',
  SOLD: 'bg-ink text-gallery-white border-0 font-medium',
  RETURNED: 'bg-control-gray/60 text-slate border-0 font-normal',
  DEFECTIVE: 'bg-launch-orange text-gallery-white border-0 font-medium',
};

/**
 * Apple-styled status badge with distinct Apple design tokens for inventory states.
 */
export function ItemStatusBadge({ status, className }: ItemStatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className={`px-2.5 py-0.5 text-[11px] rounded-full tracking-[-0.01em] ${statusStyles[status]} ${className ?? ''}`}
    >
      {t(`items.status.${status}`)}
    </Badge>
  );
}
