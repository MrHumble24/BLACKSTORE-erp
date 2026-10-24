import { useTranslation } from 'react-i18next';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input, SelectField } from '@/shared/ui';
import { useFormContext } from 'react-hook-form';
import { useCategories, type Category } from '@/entities/category';
import { useAuthStore } from '@/entities/session';
import type { ProductModelFormValues } from '../model/product-model.schema';

interface ProductModelFormFieldsProps {
  disabled: boolean;
  isEditing: boolean;
}

/** Category select for a product model; locks after creation. */
function ProductModelCategoryField({ disabled, isEditing }: { disabled: boolean; isEditing: boolean }) {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<ProductModelFormValues>();
  const { data: categories = [] } = useCategories();

  return (
    <FormField
      control={control}
      name="categoryId"
      render={({ field, fieldState }) => (
        <SelectField
          label={t('productModels.category')}
          value={field.value ? String(field.value) : ''}
          onValueChange={(val) => setValue('categoryId', Number(val), { shouldValidate: true })}
          disabled={disabled || isEditing}
          placeholder={t('items.selectCategory')}
          error={fieldState.error?.message}
          options={categories.map((category: Category) => ({
            value: String(category.id),
            label: category.name,
          }))}
        />
      )}
    />
  );
}

/** Optional low-stock threshold; empty clears it (null). Admin/manage_catalog only. */
function ProductModelThresholdField({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const { control } = useFormContext<ProductModelFormValues>();

  return (
    <FormField
      control={control}
      name="lowStockThreshold"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('productModels.lowStockThreshold')}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={1}
              disabled={disabled}
              placeholder={t('productModels.lowStockThresholdPlaceholder')}
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Category select (read-only after creation) and name input for a product model. */
export function ProductModelFormFields({ disabled, isEditing }: ProductModelFormFieldsProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<ProductModelFormValues>();
  const canManageCatalog = useAuthStore((state) => state.hasPermission('manage_catalog'));

  return (
    <>
      <ProductModelCategoryField disabled={disabled} isEditing={isEditing} />
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('productModels.name')}</FormLabel>
            <FormControl>
              <Input disabled={disabled} placeholder={t('productModels.namePlaceholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {canManageCatalog && <ProductModelThresholdField disabled={disabled} />}
    </>
  );
}
