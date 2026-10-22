import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { DialogFormFooter, FormError } from '@/shared/ui';
import { useCategories, type Category, type CategoryAttribute } from '@/entities/category';
import { useProductModels } from '@/entities/product-model';
import { useInvestors } from '@/entities/investor';
import { useLocations } from '@/entities/location';
import { useCreateItem, type IdentifierType } from '@/entities/item';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/api';
import {
  createItemValidationSchema,
  type ItemFormValues,
} from '../model/item.schema';
import { ItemCategoryModelSelects } from './ItemCategoryModelSelects';
import { ItemOwnerLocationSelects } from './ItemOwnerLocationSelects';
import { ItemDynamicAttributes } from './ItemDynamicAttributes';
import { ItemIdentifierInputs } from './ItemIdentifierInputs';
import { ItemPriceInputs } from './ItemPriceInputs';

function buildIdentifiers(values: ItemFormValues) {
  const identifiers: { type: IdentifierType; value: string }[] = [];
  if (values.imei.trim()) {
    identifiers.push({ type: 'IMEI', value: values.imei.trim().toUpperCase() });
  }
  if (values.imei2.trim()) {
    identifiers.push({ type: 'IMEI', value: values.imei2.trim().toUpperCase() });
  }
  if (values.serial.trim()) {
    identifiers.push({ type: 'SERIAL', value: values.serial.trim().toUpperCase() });
  }
  return identifiers;
}

function formatAttributes(
  raw: Record<string, string | number>,
  definitions: CategoryAttribute[] = [],
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null || String(v).trim() === '') continue;
    const def = definitions.find((a) => a.key === k);
    if (def?.type === 'NUMBER') {
      const num = Number(v);
      if (!Number.isNaN(num)) result[k] = num;
    } else {
      result[k] = String(v).trim();
    }
  }
  return result;
}

function useCreateItemSubmit(
  onClose: () => void,
  selectedCategory?: Category,
) {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutate: createItem, isPending } = useCreateItem();

  const submit = (values: ItemFormValues) => {
    setErrorMessage(null);
    createItem(
      {
        productModelId: values.productModelId,
        investorId: values.investorId,
        locationId: values.locationId,
        condition: values.condition,
        attributes: formatAttributes(values.attributes, selectedCategory?.attributes),
        identifiers: buildIdentifiers(values),
        ...(values.purchasePrice?.trim() ? { purchasePrice: values.purchasePrice.trim() } : {}),
        ...(values.salePrice?.trim() ? { salePrice: values.salePrice.trim() } : {}),
        ...(values.minSalePrice?.trim() ? { minSalePrice: values.minSalePrice.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('items.createdSuccess'));
          onClose();
        },
        onError: (err) => {
          const msg = getApiErrorMessage(err);
          setErrorMessage(getApiErrorStatus(err) === 409
            ? (msg ?? t('items.duplicateIdentifier'))
            : (msg ?? t('common.error')));
        },
      },
    );
  };

  return { submit, errorMessage, isPending };
}

const DEFAULT_FORM_VALUES: ItemFormValues = {
  categoryId: 0,
  productModelId: 0,
  investorId: 0,
  locationId: 0,
  condition: 'NEW',
  imei: '',
  imei2: '',
  serial: '',
  attributes: {},
  purchasePrice: '',
  salePrice: '',
  minSalePrice: '',
};

function useItemForm(
  onClose: () => void,
  serializedCategories: Category[],
) {
  const { t } = useTranslation();

  const form = useForm<ItemFormValues>({
    resolver: (values, ctx, opt) => {
      const category = serializedCategories.find((c) => c.id === values.categoryId);
      return zodResolver(createItemValidationSchema(category?.attributes ?? [], t))(values, ctx, opt);
    },
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { register, handleSubmit, setValue, control, formState: { errors } } = form;
  const categoryId = useWatch({ control, name: 'categoryId' });
  const modelId = useWatch({ control, name: 'productModelId' });
  const investorId = useWatch({ control, name: 'investorId' });
  const locationId = useWatch({ control, name: 'locationId' });
  const condition = useWatch({ control, name: 'condition' });
  const attributes = useWatch({ control, name: 'attributes' }) || {};

  const selectedCategory = serializedCategories.find((c) => c.id === categoryId);
  const { data: models = [] } = useProductModels(categoryId || undefined);
  const { data: investors = [] } = useInvestors();
  const { data: locations = [] } = useLocations();

  const { submit, errorMessage, isPending } = useCreateItemSubmit(onClose, selectedCategory);

  const onCategoryChange = (catId: number) => {
    setValue('categoryId', catId, { shouldValidate: true });
    setValue('productModelId', 0);
    setValue('attributes', {});
  };

  return {
    register, handleSubmit, setValue, errors, categoryId, modelId,
    investorId, locationId, condition, attributes, models, investors,
    locations, selectedCategory, onCategoryChange, submit, errorMessage, isPending,
  };
}

/** Form body inside ItemFormDialog. */
export function ItemFormContent({ onClose }: { onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const serializedCategories = categories.filter((c) => c.isSerialized);
  const s = useItemForm(onClose, serializedCategories);

  return (
    <form onSubmit={s.handleSubmit(s.submit)} className="space-y-4 pt-2">
      <FormError message={s.errorMessage} />
      <ItemCategoryModelSelects
        categoryId={s.categoryId}
        onCategoryChange={s.onCategoryChange}
        categoryError={s.errors.categoryId?.message}
        categories={serializedCategories}
        productModelId={s.modelId}
        onModelChange={(id) => s.setValue('productModelId', id, { shouldValidate: true })}
        modelError={s.errors.productModelId?.message}
        models={s.models}
        disabled={s.isPending}
      />
      <ItemOwnerLocationSelects
        investorId={s.investorId}
        onInvestorChange={(id) => s.setValue('investorId', id, { shouldValidate: true })}
        investorError={s.errors.investorId?.message}
        investors={s.investors}
        locationId={s.locationId}
        onLocationChange={(id) => s.setValue('locationId', id, { shouldValidate: true })}
        locationError={s.errors.locationId?.message}
        locations={s.locations}
        condition={s.condition}
        onConditionChange={(c) => s.setValue('condition', c, { shouldValidate: true })}
        disabled={s.isPending}
      />
      {s.selectedCategory && (
        <ItemDynamicAttributes
          attributes={s.selectedCategory.attributes}
          values={s.attributes}
          onChange={(key, val) => s.setValue(`attributes.${key}`, val, { shouldValidate: true })}
          errors={s.errors}
          disabled={s.isPending}
        />
      )}
      <ItemIdentifierInputs register={s.register} errors={s.errors} disabled={s.isPending} />
      <ItemPriceInputs register={s.register} errors={s.errors} disabled={s.isPending} />
      <DialogFormFooter onClose={onClose} isPending={s.isPending} />
    </form>
  );
}
