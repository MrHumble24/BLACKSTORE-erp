import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { ScanStatus } from '../model/types';

const statusStyles: Record<ScanStatus, string> = {
  FOUND: 'bg-ink text-gallery-white border-0 font-medium',
  WRONG_LOCATION: 'bg-launch-orange/10 text-launch-orange border border-launch-orange/20 font-medium',
  UNKNOWN: 'bg-control-gray text-ink border-0 font-medium',
  DUPLICATE: 'bg-control-gray/60 text-slate border-0 font-normal',
};

/** Colored badge for a scan outcome (FOUND / WRONG_LOCATION / UNKNOWN / DUPLICATE). */
export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={`px-2.5 py-0.5 text-[11px] rounded-full tracking-[-0.01em] ${statusStyles[status]}`}
    >
      {t(`stockCount.scanStatus.${status}`)}
    </Badge>
  );
}
