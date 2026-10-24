import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { ItemCondition } from '../model/types';

interface ItemConditionBadgeProps {
  condition: ItemCondition;
  className?: string;
}

const conditionStyles: Record<ItemCondition, string> = {
  NEW: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20 font-medium',
  USED: 'bg-control-gray text-slate border-hairline-silver/60 font-normal',
  REFURBISHED: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 font-medium',
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
