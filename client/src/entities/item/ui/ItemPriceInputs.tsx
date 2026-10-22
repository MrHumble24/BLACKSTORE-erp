import { useTranslation } from 'react-i18next';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input, Label } from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import type { ItemFormValues } from '../model/item.schema';

type PriceFieldName = 'purchasePrice' | 'salePrice' | 'minSalePrice';

/** One labelled money input used by the item pricing fields. */
function PriceInputField({
  name,
  label,
  error,
  register,
  disabled,
}: {
  name: PriceFieldName;
  label: string;
  error?: string;
  register: UseFormRegister<ItemFormValues>;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`item-${name}`}>{label}</Label>
      <Input
        id={`item-${name}`}
        inputMode="decimal"
        placeholder="0.00"
        disabled={disabled}
        className={error ? 'border-launch-orange' : ''}
        {...register(name)}
      />
      {error && <p className="text-xs text-launch-orange font-medium">{error}</p>}
    </div>
  );
}

interface ItemPriceInputsProps {
  register: UseFormRegister<ItemFormValues>;
  errors: FieldErrors<ItemFormValues>;
  disabled: boolean;
}

/** Form inputs for item pricing: purchase (cost-only), sale and minimum sale price. */
export function ItemPriceInputs({ register, errors, disabled }: ItemPriceInputsProps) {
  const { t } = useTranslation();
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));

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
          <PriceInputField
            name="purchasePrice"
            label={t('items.purchasePrice')}
            error={errors.purchasePrice?.message}
            register={register}
            disabled={disabled}
          />
        )}
        <PriceInputField
          name="salePrice"
          label={t('items.salePrice')}
          error={errors.salePrice?.message}
          register={register}
          disabled={disabled}
        />
        <PriceInputField
          name="minSalePrice"
          label={t('items.minSalePrice')}
          error={errors.minSalePrice?.message}
          register={register}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
