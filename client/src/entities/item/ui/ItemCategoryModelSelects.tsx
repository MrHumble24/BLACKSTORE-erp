import { useTranslation } from 'react-i18next';
import { SelectField } from '@/shared/ui';
import { type Category } from '@/entities/category';
import { type ProductModel } from '@/entities/product-model';

interface Props {
  categoryId: number;
  onCategoryChange: (id: number) => void;
  categoryError?: string;
  categories: Category[];
  productModelId: number;
  onModelChange: (id: number) => void;
  modelError?: string;
  models: ProductModel[];
  disabled: boolean;
}

/** Searchable dropdowns for selecting item Category and Product Model. */
export function ItemCategoryModelSelects({
  categoryId,
  onCategoryChange,
  categoryError,
  categories,
  productModelId,
  onModelChange,
  modelError,
  models,
  disabled,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectField
        searchable
        label={t('items.category')}
        required
        value={categoryId ? String(categoryId) : ''}
        onValueChange={(val) => onCategoryChange(Number(val))}
        disabled={disabled}
        placeholder={t('items.selectCategory')}
        error={categoryError}
        options={categories.map((c) => ({
          value: String(c.id),
          label: c.name,
        }))}
      />
      <SelectField
        searchable
        label={t('items.model')}
        required
        value={productModelId ? String(productModelId) : ''}
        onValueChange={(val) => onModelChange(Number(val))}
        disabled={disabled || !categoryId}
        placeholder={t('items.selectModel')}
        error={modelError}
        options={models.map((m) => ({
          value: String(m.id),
          label: m.name,
        }))}
      />
    </div>
  );
}
