import { useTranslation } from 'react-i18next';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input, Label } from '@/shared/ui';
import type { ItemFormValues } from '../model/item.schema';

interface ItemIdentifierInputsProps {
  register: UseFormRegister<ItemFormValues>;
  errors: FieldErrors<ItemFormValues>;
  disabled: boolean;
}

/** Form inputs for device hardware identifiers (IMEI 1, IMEI 2, Serial). */
export function ItemIdentifierInputs({
  register,
  errors,
  disabled,
}: ItemIdentifierInputsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 pt-1 border-t border-hairline-silver/60">
      <div className="text-xs font-semibold text-ink tracking-tight uppercase">
        {t('items.identifiers')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="item-imei">
            {t('items.imei1')}
          </Label>
          <Input
            id="item-imei"
            placeholder={t('items.placeholderImei')}
            disabled={disabled}
            className={errors.imei ? 'border-launch-orange' : ''}
            {...register('imei')}
          />
          {errors.imei && (
            <p className="text-xs text-launch-orange font-medium">{errors.imei.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="item-imei2">
            {t('items.imei2')}
          </Label>
          <Input
            id="item-imei2"
            placeholder={t('items.placeholderImei2')}
            disabled={disabled}
            className={errors.imei2 ? 'border-launch-orange' : ''}
            {...register('imei2')}
          />
          {errors.imei2 && (
            <p className="text-xs text-launch-orange font-medium">{errors.imei2.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="item-serial">
            {t('items.serial')}
          </Label>
          <Input
            id="item-serial"
            placeholder={t('items.placeholderSerial')}
            disabled={disabled}
            className={errors.serial ? 'border-launch-orange' : ''}
            {...register('serial')}
          />
          {errors.serial && (
            <p className="text-xs text-launch-orange font-medium">{errors.serial.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
