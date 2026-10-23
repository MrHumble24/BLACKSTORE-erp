import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { ConsignmentItemStatus } from '../model/types';

interface ConsignmentItemStatusBadgeProps {
  status: ConsignmentItemStatus;
  className?: string;
}

const statusStyles: Record<ConsignmentItemStatus, string> = {
  AT_PARTNER: 'bg-apple-blue/10 text-apple-blue border border-apple-blue/20 font-medium',
  SOLD: 'bg-ink text-gallery-white border-0 font-medium',
  RETURNED: 'bg-control-gray/60 text-slate border-0 font-normal',
};

/** Status badge for consignment line items. */
export function ConsignmentItemStatusBadge({
  status,
  className,
}: ConsignmentItemStatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className={`px-2.5 py-0.5 text-[11px] rounded-full tracking-[-0.01em] ${statusStyles[status]} ${className ?? ''}`}
    >
      {t(`consign.status.${status}`)}
    </Badge>
  );
}
