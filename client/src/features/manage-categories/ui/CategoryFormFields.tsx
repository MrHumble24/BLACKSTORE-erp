import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription, Input, Switch } from '@/shared/ui';
import type { CategoryFormValues } from '../model/category.schema';

interface CategoryFormFieldsProps {
  disabled: boolean;
}

/** Name input and serialized switch for the category form. */
export function CategoryFormFields({ disabled }: CategoryFormFieldsProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<CategoryFormValues>();

  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('categories.name')}</FormLabel>
            <FormControl>
              <Input placeholder={t('categories.namePlaceholder')} disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="isSerialized"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('categories.isSerialized')}</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
            </FormControl>
            <FormDescription>{t('categories.isSerializedHelp')}</FormDescription>
          </FormItem>
        )}
      />
    </>
  );
}
