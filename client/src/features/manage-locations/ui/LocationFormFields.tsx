import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input, SelectField } from '@/shared/ui';
import type { LocationFormValues } from '../model/location.schema';

interface LocationFormFieldsProps {
  disabled: boolean;
}

/** Name input and warehouse/shop type select for the location form. */
export function LocationFormFields({ disabled }: LocationFormFieldsProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<LocationFormValues>();

  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('locations.name')}</FormLabel>
            <FormControl>
              <Input placeholder={t('locations.namePlaceholder')} disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="type"
        render={({ field, fieldState }) => (
          <SelectField
            label={t('locations.typeLabel')}
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
            placeholder={t('locations.selectType')}
            error={fieldState.error?.message}
            options={[
              { value: 'WAREHOUSE', label: t('locations.type.WAREHOUSE') },
              { value: 'SHOP', label: t('locations.type.SHOP') },
            ]}
          />
        )}
      />
    </>
  );
}
