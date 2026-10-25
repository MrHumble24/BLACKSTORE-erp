import { useTranslation } from 'react-i18next';
import { useCategories, type CategoryAttribute } from '@/entities/category';
import { useProductModels } from '@/entities/product-model';
import {
  COMMON_COLOR_OPTIONS,
  COMMON_PROCESSOR_OPTIONS,
  type ItemFilters,
} from '@/entities/item';
import { FilterSelect } from './FilterSelect';

interface CategoryModelVariantFilterProps {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
}

/** Resolves predefined or fallback options for dynamic category attributes. */
function getAttributeOptions(attr: CategoryAttribute): string[] {
  if (attr.options && attr.options.length > 0) {
    return attr.options;
  }
  const key = attr.key.toLowerCase();
  if (key.includes('color')) {
    return COMMON_COLOR_OPTIONS;
  }
  if (key.includes('processor') || key.includes('cpu')) {
    return COMMON_PROCESSOR_OPTIONS;
  }
  return [];
}

/** Cascading Category -> Model -> Variant dropdown filters for items inventory. */
export function CategoryModelVariantFilter({
  filters,
  onChange,
}: CategoryModelVariantFilterProps) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const { data: models = [] } = useProductModels(filters.categoryId, false);

  const selectedCategory = categories.find((c) => c.id === filters.categoryId);
  const variantAttributes = (selectedCategory?.attributes ?? [])
    .map((attr) => ({ attr, options: getAttributeOptions(attr) }))
    .filter((entry) => entry.options.length > 0);

  const handleCategoryChange = (val: string) => {
    onChange({
      ...filters,
      categoryId: val === 'ALL' ? undefined : Number(val),
      productModelId: undefined,
      attributes: undefined,
    });
  };

  const handleModelChange = (val: string) => {
    onChange({
      ...filters,
      productModelId: val === 'ALL' ? undefined : Number(val),
    });
  };

  const handleAttributeChange = (key: string, val: string) => {
    const nextAttrs = { ...(filters.attributes ?? {}) };
    if (val === 'ALL') {
      delete nextAttrs[key];
    } else {
      nextAttrs[key] = val;
    }
    const hasKeys = Object.keys(nextAttrs).length > 0;
    onChange({
      ...filters,
      attributes: hasKeys ? nextAttrs : undefined,
    });
  };

  return (
    <>
      <FilterSelect
        value={filters.categoryId ? String(filters.categoryId) : 'ALL'}
        placeholder={t('items.allCategories')}
        onChange={handleCategoryChange}
        options={[
          { value: 'ALL', label: t('items.allCategories') },
          ...categories.map((c) => ({ value: String(c.id), label: c.name })),
        ]}
      />

      {Boolean(filters.categoryId) && models.length > 0 && (
        <FilterSelect
          value={filters.productModelId ? String(filters.productModelId) : 'ALL'}
          placeholder={t('items.allModels')}
          onChange={handleModelChange}
          options={[
            { value: 'ALL', label: t('items.allModels') },
            ...models.map((m) => ({ value: String(m.id), label: m.name })),
          ]}
        />
      )}

      {Boolean(filters.categoryId) &&
        variantAttributes.map(({ attr, options }) => {
          const currentValue = filters.attributes?.[attr.key] !== undefined
            ? String(filters.attributes[attr.key])
            : 'ALL';

          return (
            <FilterSelect
              key={attr.key}
              value={currentValue}
              placeholder={attr.label}
              onChange={(val) => handleAttributeChange(attr.key, val)}
              options={[
                { value: 'ALL', label: attr.label },
                ...options.map((opt) => ({ value: opt, label: opt })),
              ]}
            />
          );
        })}
    </>
  );
}
