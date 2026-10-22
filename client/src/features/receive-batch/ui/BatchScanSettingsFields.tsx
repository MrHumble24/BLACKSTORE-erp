import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { SelectField, TextField } from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import type { Category } from '@/entities/category';
import { useProductModels } from '@/entities/product-model';
import { ItemCategoryModelSelects, ItemDynamicAttributes } from '@/entities/item';
import type { BatchScanValues } from '../model/batch.schema';

interface BatchScanSettingsFieldsProps {
  form: UseFormReturn<BatchScanValues>;
  categories: Category[];
  canManagePrices: boolean;
  disabled: boolean;
}

/** Condition dropdown + the purchase price input (cost: manage_prices AND view_cost). */
function ConditionPriceRow({
  form,
  canManagePrices,
  disabled,
}: {
  form: UseFormReturn<BatchScanValues>;
  canManagePrices: boolean;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const { register, setValue } = form;
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectField
        label={t('items.conditionLabel')}
        required
        value={form.watch('condition')}
        onValueChange={(val) => setValue('condition', val as BatchScanValues['condition'])}
        disabled={disabled}
        options={[
          { value: 'NEW', label: t('items.condition.NEW') },
          { value: 'USED', label: t('items.condition.USED') },
          { value: 'REFURBISHED', label: t('items.condition.REFURBISHED') },
        ]}
      />
      {canManagePrices && canViewCost && (
        <TextField
          id="batch-scan-price"
          label={t('items.purchasePrice')}
          inputMode="decimal"
          placeholder="0.00"
          disabled={disabled}
          {...register('purchasePrice')}
        />
      )}
    </div>
  );
}

/** Category → model pair plus condition (purchase price is manage_prices only). */
function ScanSettingSelects({
  form,
  categories,
  canManagePrices,
  disabled,
}: {
  form: UseFormReturn<BatchScanValues>;
  categories: Category[];
  canManagePrices: boolean;
  disabled: boolean;
}) {
  const categoryId = form.watch('categoryId');
  const { data: models = [] } = useProductModels(categoryId || undefined);

  return (
    <>
      <ItemCategoryModelSelects
        categoryId={categoryId}
        onCategoryChange={(catId) => {
          form.setValue('categoryId', catId, { shouldValidate: true });
          form.setValue('productModelId', 0);
          form.setValue('attributes', {});
        }}
        categoryError={form.formState.errors.categoryId?.message}
        categories={categories}
        productModelId={form.watch('productModelId')}
        onModelChange={(id) => form.setValue('productModelId', id, { shouldValidate: true })}
        modelError={form.formState.errors.productModelId?.message}
        models={models}
        disabled={disabled}
      />
      <ConditionPriceRow form={form} canManagePrices={canManagePrices} disabled={disabled} />
    </>
  );
}

/**
 * One-time scan settings (FR-14/W1 steps 2-3): product model, condition, optional
 * purchase price (manage_prices) and the category's attribute values.
 */
export function BatchScanSettingsFields({
  form,
  categories,
  canManagePrices,
  disabled,
}: BatchScanSettingsFieldsProps) {
  const { setValue, formState: { errors } } = form;
  const categoryId = form.watch('categoryId');
  const attributes = form.watch('attributes') || {};
  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="space-y-3">
      <ScanSettingSelects
        form={form}
        categories={categories}
        canManagePrices={canManagePrices}
        disabled={disabled}
      />
      {selectedCategory && (
        <ItemDynamicAttributes
          attributes={selectedCategory.attributes}
          values={attributes}
          onChange={(key, val) => setValue(`attributes.${key}`, val, { shouldValidate: true })}
          errors={errors}
          disabled={disabled}
        />
      )}
    </div>
  );
}
