import { useTranslation } from 'react-i18next';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input, Label } from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import type { ItemFormValues } from '../model/item.schema';

interface ItemPriceInputsProps {
  register: UseFormRegister<ItemFormValues>;
  errors: FieldErrors<ItemFormValues>;
  disabled: boolean;
}

/** Form inputs for item pricing (purchase price, sale price, minimum sale price). */
export function ItemPriceInputs({ register, errors, disabled }: ItemPriceInputsProps) {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManagePrices = hasPermission('manage_prices');
  const canViewCost = hasPermission('view_cost');

  if (!canManagePrices) {
    return null;
  }

  return (
    <div className="space-y-3 pt-1 border-t border-hairline-silver/60">
      <div className="text-xs font-semibold text-ink tracking-tight uppercase">
        {t('items.pricing')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {canViewCost && (
          <div className="space-y-1">
            <Label htmlFor="item-purchase-price">
              {t('items.purchasePrice')}
            </Label>
            <Input
              id="item-purchase-price"
              placeholder="0.00"
              disabled={disabled}
              className={errors.purchasePrice ? 'border-launch-orange' : ''}
              {...register('purchasePrice')}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="item-sale-price">
            {t('items.salePrice')}
          </Label>
          <Input
            id="item-sale-price"
            placeholder="0.00"
            disabled={disabled}
            className={errors.salePrice ? 'border-launch-orange' : ''}
            {...register('salePrice')}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="item-min-price">
            {t('items.minSalePrice')}
          </Label>
          <Input
            id="item-min-price"
            placeholder="0.00"
            disabled={disabled}
            className={errors.minSalePrice ? 'border-launch-orange' : ''}
            {...register('minSalePrice')}
          />
        </div>
      </div>
    </div>
  );
}
