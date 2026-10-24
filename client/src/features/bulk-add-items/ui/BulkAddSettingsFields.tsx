import { useEffect } from 'react';
import { type FieldErrors } from 'react-hook-form';
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
import type { BulkScanState } from '../model/useBulkScan';

/** Owner (investor), location and condition selects bound to the persisted store. */
function OwnerLocationBlock({ scan }: { scan: BulkScanState }) {
  const store = useBulkAddStore();
  const onClearError = scan.clearConfigError;
  const { data: investors = [] } = useInvestors();
  const { data: locations = [] } = useLocations();

  useEffect(() => {
    if (investors.length > 0 && store.investorId > 0 && !investors.some((i) => i.id === store.investorId)) {
      store.setField('investorId', 0);
    }
  }, [investors, store]);

  useEffect(() => {
    if (locations.length > 0 && store.locationId > 0 && !locations.some((l) => l.id === store.locationId)) {
      store.setField('locationId', 0);
    }
  }, [locations, store]);

  return (
    <ItemOwnerLocationSelects
      investorId={store.investorId}
      onInvestorChange={(id) => {
        store.setField('investorId', id);
        onClearError('investorId');
      }}
      investorError={scan.configErrors.investorId}
      investors={investors}
      locationId={store.locationId}
      onLocationChange={(id) => {
        store.setField('locationId', id);
        onClearError('locationId');
      }}
      locationError={scan.configErrors.locationId}
      locations={locations}
      condition={store.condition}
      onConditionChange={(condition: ItemCondition) => store.setField('condition', condition)}
      disabled={scan.isCreating}
    />
  );
}

/**
 * Category / model / owner / location / condition dropdowns plus the dynamic attribute fields
 * of the selected category; the persisted bulk-add store is the single source of truth.
 */
export function BulkAddSettingsFields({ scan }: { scan: BulkScanState }) {
  const store = useBulkAddStore();
  const onClearError = scan.clearConfigError;
  const { configErrors: errors } = scan;

  const { data: categoriesData = [] } = useCategories();
  const categories = categoriesData.filter((c) => c.isSerialized);
  const { data: models = [] } = useProductModels(store.categoryId || undefined);

  useEffect(() => {
    if (categories.length > 0 && store.categoryId > 0 && !categories.some((c) => c.id === store.categoryId)) {
      store.setCategory(0);
    }
  }, [categories, store]);

  useEffect(() => {
    if (models.length > 0 && store.productModelId > 0 && !models.some((m) => m.id === store.productModelId)) {
      store.setField('productModelId', 0);
    }
  }, [models, store]);

  const selectedCategory = categories.find((c) => c.id === store.categoryId);

  const setAttribute = (key: string, value: string) => {
    store.setField('attributes', { ...store.attributes, [key]: value });
    onClearError(`attributes.${key}`);
  };

  return (
    <div className="space-y-3">
      <ItemCategoryModelSelects
        categoryId={store.categoryId}
        onCategoryChange={(id) => {
          store.setCategory(id);
          onClearError('categoryId');
          onClearError('productModelId');
        }}
        categoryError={errors.categoryId}
        categories={categories}
        productModelId={store.productModelId}
        onModelChange={(id) => {
          store.setField('productModelId', id);
          onClearError('productModelId');
        }}
        modelError={errors.productModelId}
        models={models}
        disabled={scan.isCreating}
      />
      <OwnerLocationBlock scan={scan} />
      {selectedCategory && (
        <ItemDynamicAttributes
          attributes={selectedCategory.attributes}
          values={store.attributes}
          onChange={setAttribute}
          errors={attributeFieldErrors(errors)}
          disabled={scan.isCreating}
        />
      )}
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
