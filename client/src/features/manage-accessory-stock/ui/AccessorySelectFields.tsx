import { useTranslation } from 'react-i18next';
import { SelectField } from '@/shared/ui';
import type { Category } from '@/entities/category';
import type { ProductModel } from '@/entities/product-model';
import type { Location } from '@/entities/location';

interface Props {
  categoryId: number;
  onCategoryChange: (id: number) => void;
  categories: Category[];
  productModelId: number;
  onModelChange: (id: number) => void;
  models: ProductModel[];
  locationId: number;
  onLocationChange: (id: number) => void;
  locations: Location[];
  disabled: boolean;
}

/** Dropdowns for Category, Accessory Product Model, and Destination Location. */
export function AccessorySelectFields({
  categoryId,
  onCategoryChange,
  categories,
  productModelId,
  onModelChange,
  models,
  locationId,
  onLocationChange,
  locations,
  disabled,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <SelectField
        label={t('accessories.category')}
        required
        value={categoryId ? String(categoryId) : ''}
        onValueChange={(val) => onCategoryChange(Number(val))}
        disabled={disabled}
        placeholder={t('accessories.selectCategory')}
        options={categories.map((c) => ({
          value: String(c.id),
          label: c.name,
        }))}
      />
      <SelectField
        label={t('accessories.model')}
        required
        value={productModelId ? String(productModelId) : ''}
        onValueChange={(val) => onModelChange(Number(val))}
        disabled={disabled || !categoryId}
        placeholder={t('accessories.selectModel')}
        options={models.map((m) => ({
          value: String(m.id),
          label: m.name,
        }))}
      />
      <SelectField
        label={t('accessories.location')}
        required
        value={locationId ? String(locationId) : ''}
        onValueChange={(val) => onLocationChange(Number(val))}
        disabled={disabled}
        placeholder={t('accessories.selectLocation')}
        options={locations.map((l) => ({
          value: String(l.id),
          label: l.name,
        }))}
      />
    </div>
  );
}
