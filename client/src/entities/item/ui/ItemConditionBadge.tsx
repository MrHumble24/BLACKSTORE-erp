import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { ItemCondition } from '../model/types';

interface ItemConditionBadgeProps {
  condition: ItemCondition;
  className?: string;
}

const conditionStyles: Record<ItemCondition, string> = {
  NEW: 'bg-gallery-white text-ink border border-hairline-silver font-medium',
  USED: 'bg-control-gray text-slate border-0 font-normal',
  REFURBISHED: 'bg-control-gray/50 text-slate border border-hairline-silver/60 font-normal',
};

/**
 * Apple-styled device condition pill badge (New, Used, Refurbished).
 */
export function ItemConditionBadge({ condition, className }: ItemConditionBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className={`px-2 py-0.5 text-[11px] rounded-full tracking-[-0.01em] ${conditionStyles[condition]} ${className ?? ''}`}
    >
      {t(`items.condition.${condition}`)}
    </Badge>
  );
}
