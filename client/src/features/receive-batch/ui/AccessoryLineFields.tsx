import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogFormFooter, FormError, Form, TextField } from '@/shared/ui';
import { normalizeMoney, useCreateOrUpdate } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { useCategories } from '@/entities/category';
import { useProductModels, type ProductModel } from '@/entities/product-model';
import { useAddBatchAccessory, type AddBatchAccessoryPayload } from '@/entities/batch';
import { ItemCategoryModelSelects } from '@/entities/item';
import { createBatchAccessorySchema, type BatchAccessoryValues } from '../model/batch.schema';

import type { UseFormReturn } from 'react-hook-form';
import type { Category } from '@/entities/category';

/** Category → model dropdown pair (models reload per category). */
function AccessorySelectPair({
  form,
  categories,
  models,
  disabled,
}: {
  form: UseFormReturn<BatchAccessoryValues>;
  categories: Category[];
  models: ProductModel[];
  disabled: boolean;
}) {
  const errors = form.formState.errors;
  // useWatch so this isolated select pair re-renders when setValue updates them.
  const categoryId = useWatch({ control: form.control, name: 'categoryId' });
  const productModelId = useWatch({ control: form.control, name: 'productModelId' });

  return (
    <ItemCategoryModelSelects
      categoryId={categoryId}
      onCategoryChange={(catId) => {
        form.setValue('categoryId', catId, { shouldValidate: true });
        form.setValue('productModelId', 0);
      }}
      categoryError={errors.categoryId?.message}
      categories={categories}
      productModelId={productModelId}
      onModelChange={(id) => form.setValue('productModelId', id, { shouldValidate: true })}
      modelError={errors.productModelId?.message}
      models={models}
      disabled={disabled}
    />
  );
}

/** Quantity input plus the unit-cost input, which is a cost (manage_prices AND view_cost). */
function QuantityCostFields({
  form,
  canManagePrices,
  disabled,
}: {
  form: UseFormReturn<BatchAccessoryValues>;
  canManagePrices: boolean;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const { register } = form;
  const errors = form.formState.errors;
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <TextField
        id="accessory-line-qty"
        label={`${t('accessories.quantity')} *`}
        type="number"
        min={1}
        step={1}
        {...register('quantity')}
        disabled={disabled}
        error={errors.quantity?.message}
      />
      {canManagePrices && canViewCost && (
        <TextField
          id="accessory-line-cost"
          label={t('accessories.unitCost')}
          inputMode="decimal"
          placeholder="0.00"
          {...register('unitCost')}
          disabled={disabled}
          error={errors.unitCost?.message}
        />
      )}
    </div>
  );
}

interface AccessoryLineFieldsProps {
  batchId: number;
  onClose: () => void;
}

/** Form body for adding an accessory line to a batch (quantity per unit cost rules). */
export function AccessoryLineFields({ batchId, onClose }: AccessoryLineFieldsProps) {
  const { t } = useTranslation();
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const { mutate: addAccessory, isPending: adding } = useAddBatchAccessory();
  const { data: categories = [] } = useCategories();
  const nonSerialized = categories.filter((c) => !c.isSerialized);

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (payload: AddBatchAccessoryPayload, opt) => addAccessory({ id: batchId, payload }, opt),
    // Create-only dialog: the update branch of useCreateOrUpdate never runs.
    update: () => undefined,
    isPending: adding,
    isEditing: false,
    successMessage: t('batches.accessoryAddedSuccess'),
    onDone: onClose,
  });

  const form = useForm<BatchAccessoryValues>({
    resolver: zodResolver(createBatchAccessorySchema(t, canManagePrices)),
    defaultValues: { categoryId: 0, productModelId: 0, quantity: '1', unitCost: '' },
  });
  const categoryId = useWatch({ control: form.control, name: 'categoryId' });
  const { data: models = [] } = useProductModels(categoryId || undefined);

  const onSubmit = form.handleSubmit((values) => {
    submit({
      productModelId: values.productModelId,
      quantity: Number(values.quantity),
      ...(canManagePrices && values.unitCost?.trim()
        ? { unitCost: normalizeMoney(values.unitCost) }
        : {}),
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <AccessoryLineInputs
          form={form}
          categories={nonSerialized}
          models={models}
          canManagePrices={canManagePrices}
          disabled={isPending}
        />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}

/** Non-serialized model select + quantity + optional unit-cost inputs. */
function AccessoryLineInputs({
  form,
  categories,
  models,
  canManagePrices,
  disabled,
}: {
  form: UseFormReturn<BatchAccessoryValues>;
  categories: Category[];
  models: ProductModel[];
  canManagePrices: boolean;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <AccessorySelectPair form={form} categories={categories} models={models} disabled={disabled} />
      <QuantityCostFields form={form} canManagePrices={canManagePrices} disabled={disabled} />
    </div>
  );
}
