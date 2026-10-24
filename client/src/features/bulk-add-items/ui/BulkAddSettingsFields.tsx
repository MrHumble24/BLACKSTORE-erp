import { type FieldErrors } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';
import {
  ItemCategoryModelSelects,
  ItemOwnerLocationSelects,
  ItemDynamicAttributes,
  type ItemFormValues,
  type ItemCondition,
} from '@/entities/item';
import { useCategories } from '@/entities/category';
import { useProductModels } from '@/entities/product-model';
import { useInvestors } from '@/entities/investor';
import { useLocations } from '@/entities/location';
import { useBulkAddStore } from '../model/bulkAdd.store';
import { useResetMissingId } from '../model/useResetMissingId';
import type { BulkScanState } from '../model/useBulkScan';

type Props = { scan: BulkScanState };

/** Serialized categories only (bulk add is for devices with codes); undefined until loaded. */
function useSerializedCategories() {
  const { data } = useCategories();
  return data?.filter((c) => c.isSerialized);
}

/** Category and model selects; stale persisted ids are dropped once their list loads without them. */
function CategoryModelBlock({ scan }: Props) {
  const { categoryId, productModelId } = useBulkAddStore(
    useShallow((s) => ({ categoryId: s.categoryId, productModelId: s.productModelId })),
  );
  const setField = useBulkAddStore((s) => s.setField);
  const setCategory = useBulkAddStore((s) => s.setCategory);
  const onClearError = scan.clearConfigError;
  const categories = useSerializedCategories();
  const { data: models } = useProductModels(categoryId || undefined);

  // An empty model list (every model of the category deactivated) also resets, else the server 400s.
  useResetMissingId(categories, categoryId, () => setCategory(0));
  useResetMissingId(models, productModelId, () => setField('productModelId', 0));

  return (
    <ItemCategoryModelSelects
      categoryId={categoryId}
      onCategoryChange={(id) => {
        setCategory(id);
        onClearError('categoryId');
        onClearError('productModelId');
      }}
      categoryError={scan.configErrors.categoryId}
      categories={categories ?? []}
      productModelId={productModelId}
      onModelChange={(id) => {
        setField('productModelId', id);
        onClearError('productModelId');
      }}
      modelError={scan.configErrors.productModelId}
      models={models ?? []}
      disabled={scan.isCreating}
    />
  );
}

/** Owner (investor), location and condition selects bound to the persisted store. */
function OwnerLocationBlock({ scan }: Props) {
  const { investorId, locationId, condition } = useBulkAddStore(
    useShallow((s) => ({ investorId: s.investorId, locationId: s.locationId, condition: s.condition })),
  );
  const setField = useBulkAddStore((s) => s.setField);
  const onClearError = scan.clearConfigError;
  const { data: investors } = useInvestors();
  const { data: locations } = useLocations();

  useResetMissingId(investors, investorId, () => setField('investorId', 0));
  useResetMissingId(locations, locationId, () => setField('locationId', 0));

  return (
    <ItemOwnerLocationSelects
      investorId={investorId}
      onInvestorChange={(id) => {
        setField('investorId', id);
        onClearError('investorId');
      }}
      investorError={scan.configErrors.investorId}
      investors={investors ?? []}
      locationId={locationId}
      onLocationChange={(id) => {
        setField('locationId', id);
        onClearError('locationId');
      }}
      locationError={scan.configErrors.locationId}
      locations={locations ?? []}
      condition={condition}
      onConditionChange={(value: ItemCondition) => setField('condition', value)}
      disabled={scan.isCreating}
    />
  );
}

/** Dynamic attribute inputs of the selected category (nothing while no category is chosen). */
function AttributesBlock({ scan }: Props) {
  const { categoryId, attributes } = useBulkAddStore(
    useShallow((s) => ({ categoryId: s.categoryId, attributes: s.attributes })),
  );
  const setField = useBulkAddStore((s) => s.setField);
  const selectedCategory = useSerializedCategories()?.find((c) => c.id === categoryId);
  if (!selectedCategory) return null;

  const setAttribute = (key: string, value: string) => {
    setField('attributes', { ...attributes, [key]: value });
    scan.clearConfigError(`attributes.${key}`);
  };

  return (
    <ItemDynamicAttributes
      attributes={selectedCategory.attributes}
      values={attributes}
      onChange={setAttribute}
      errors={attributeFieldErrors(scan.configErrors)}
      disabled={scan.isCreating}
    />
  );
}

/**
 * Category / model / owner / location / condition dropdowns plus the dynamic attribute fields
 * of the selected category; the persisted bulk-add store is the single source of truth.
 */
export function BulkAddSettingsFields({ scan }: Props) {
  return (
    <div className="space-y-3">
      <CategoryModelBlock scan={scan} />
      <OwnerLocationBlock scan={scan} />
      <AttributesBlock scan={scan} />
    </div>
  );
}

/** Maps `attributes.<key>` config errors into the nested shape ItemDynamicAttributes expects. */
function attributeFieldErrors(errors: Record<string, string>): FieldErrors<ItemFormValues> {
  const attrErrors: Record<string, { message?: string }> = {};
  for (const [key, message] of Object.entries(errors)) {
    if (!key.startsWith('attributes.')) continue;
    attrErrors[key.replace('attributes.', '')] = { message };
  }
  return { attributes: attrErrors } as FieldErrors<ItemFormValues>;
}
