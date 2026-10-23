import { useTranslation } from 'react-i18next';
import { useWatch, type UseFormReturn, type FieldErrors } from 'react-hook-form';
import { TextField } from '@/shared/ui';
import { useProductModels } from '@/entities/product-model';
import type { Category } from '@/entities/category';
import type { Investor } from '@/entities/investor';
import type { Location } from '@/entities/location';
import { ItemCategoryModelSelects, ItemOwnerLocationSelects } from '@/entities/item';
import type { WalkInPurchaseFormValues } from '../model/walk-in.schema';

/** Seller name and phone inputs (FR-25). */
export function WalkInSellerFields({
  form,
  errors,
  disabled,
}: {
  form: UseFormReturn<WalkInPurchaseFormValues>;
  errors: FieldErrors<WalkInPurchaseFormValues>;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <TextField
        id="walk-in-seller-name"
        label={`${t('walkIn.sellerName')} *`}
        {...form.register('sellerName')}
        disabled={disabled}
        error={errors.sellerName?.message}
      />
      <TextField
        id="walk-in-seller-phone"
        label={`${t('walkIn.sellerPhone')} *`}
        {...form.register('sellerPhone')}
        disabled={disabled}
        error={errors.sellerPhone?.message}
      />
    </div>
  );
}

/** Category → model dropdown pair (models reload per category). */
function WalkInCategoryModelFields({
  form,
  categories,
  errors,
  disabled,
}: {
  form: UseFormReturn<WalkInPurchaseFormValues>;
  categories: Category[];
  errors: FieldErrors<WalkInPurchaseFormValues>;
  disabled: boolean;
}) {
  // useWatch so category/model changes re-render these dependent selects.
  const categoryId = useWatch({ control: form.control, name: 'categoryId' });
  const productModelId = useWatch({ control: form.control, name: 'productModelId' });
  const { data: models = [] } = useProductModels(categoryId || undefined);

  return (
    <ItemCategoryModelSelects
      categoryId={categoryId}
      onCategoryChange={(catId) => {
        form.setValue('categoryId', catId, { shouldValidate: true });
        form.setValue('productModelId', 0);
        form.setValue('attributes', {});
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

/** Owner (business by default), location and condition dropdowns. */
function WalkInOwnerFields({
  form,
  investors,
  locations,
  errors,
  disabled,
}: {
  form: UseFormReturn<WalkInPurchaseFormValues>;
  investors: Investor[];
  locations: Location[];
  errors: FieldErrors<WalkInPurchaseFormValues>;
  disabled: boolean;
}) {
  // useWatch so owner/location/condition selects re-render on setValue.
  const investorId = useWatch({ control: form.control, name: 'investorId' });
  const locationId = useWatch({ control: form.control, name: 'locationId' });
  const condition = useWatch({ control: form.control, name: 'condition' });

  return (
    <ItemOwnerLocationSelects
      investorId={investorId}
      onInvestorChange={(id) => form.setValue('investorId', id, { shouldValidate: true })}
      investorError={errors.investorId?.message}
      investors={investors}
      locationId={locationId}
      onLocationChange={(id) => form.setValue('locationId', id, { shouldValidate: true })}
      locationError={errors.locationId?.message}
      locations={locations}
      condition={condition}
      onConditionChange={(c) => form.setValue('condition', c, { shouldValidate: true })}
      disabled={disabled}
    />
  );
}

interface WalkInModelFieldsProps {
  form: UseFormReturn<WalkInPurchaseFormValues>;
  categories: Category[];
  investors: Investor[];
  locations: Location[];
  disabled: boolean;
}

/** Category → model, owner (business by default), location and condition dropdowns. */
export function WalkInModelFields(props: WalkInModelFieldsProps) {
  const errors = props.form.formState.errors;

  return (
    <div className="space-y-3">
      <WalkInCategoryModelFields {...props} errors={errors} />
      <WalkInOwnerFields {...props} errors={errors} />
    </div>
  );
}
