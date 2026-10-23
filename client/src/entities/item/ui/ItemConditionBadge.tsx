import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { ItemCondition } from '../model/types';

interface ItemConditionBadgeProps {
  condition: ItemCondition;
  className?: string;
}

const conditionStyles: Record<ItemCondition, string> = {
  NEW: 'bg-sky-50 text-sky-700 border-sky-200/70 font-medium',
  USED: 'bg-zinc-100 text-zinc-600 border-zinc-200 font-normal',
  REFURBISHED: 'bg-violet-50 text-violet-700 border-violet-200/70 font-medium',
};

/**
 * Modern ERP-styled device condition pill badge (New, Used, Refurbished).
 */
export function ItemConditionBadge({ condition, className }: ItemConditionBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full whitespace-nowrap tracking-[-0.01em] border ${conditionStyles[condition]} ${className ?? ''}`}
    >
      {t(`items.condition.${condition}`)}
    </Badge>
  );
}
