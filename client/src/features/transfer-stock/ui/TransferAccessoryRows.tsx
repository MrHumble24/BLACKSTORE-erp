import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Button, SelectField, Input, Label } from '@/shared/ui';
import { useProductModels } from '@/entities/product-model';
import type { Category } from '@/entities/category';
import { newAccessoryDraft, type AccessoryDraft } from '../model/accessory-draft';

/** Category + model + quantity for one accessory line; models reload per category. */
function AccessoryRow({
  row,
  categories,
  onChange,
  onRemove,
  disabled,
}: {
  row: AccessoryDraft;
  categories: Category[];
  onChange: (row: AccessoryDraft) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const { data: models = [] } = useProductModels(row.categoryId || undefined);

  return (
    <div className="flex items-end gap-2">
      <SelectField
        label={t('transfers.category')}
        className="space-y-1 flex-1"
        value={row.categoryId ? String(row.categoryId) : ''}
        onValueChange={(v) => onChange({ ...row, categoryId: Number(v), productModelId: 0 })}
        placeholder={t('transfers.selectCategory')}
        options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
        disabled={disabled}
      />
      <SelectField
        label={t('transfers.model')}
        className="space-y-1 flex-1"
        value={row.productModelId ? String(row.productModelId) : ''}
        onValueChange={(v) => onChange({ ...row, productModelId: Number(v) })}
        placeholder={t('transfers.selectModel')}
        options={models.map((m) => ({ value: String(m.id), label: m.name }))}
        disabled={disabled || !row.categoryId}
      />
      <div className="space-y-1 w-24">
        <Label htmlFor={`qty-${row.key}`}>{t('transfers.quantity')}</Label>
        <Input
          id={`qty-${row.key}`}
          type="number"
          min={1}
          step={1}
          value={row.quantity}
          onChange={(e) => onChange({ ...row, quantity: e.target.value })}
          disabled={disabled}
        />
      </div>
      <Button type="button" variant="outline" size="icon" onClick={onRemove} disabled={disabled} className="h-9 w-9 rounded-full">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface Props {
  rows: AccessoryDraft[];
  categories: Category[];
  onChange: (rows: AccessoryDraft[]) => void;
  disabled: boolean;
}

/** The "Add accessories" block: several category+model+quantity rows. */
export function TransferAccessoryRows({ rows, categories, onChange, disabled }: Props) {
  const { t } = useTranslation();

  const setRow = (i: number, row: AccessoryDraft) => onChange(rows.map((r, idx) => (idx === i ? row : r)));
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <AccessoryRow
            key={row.key}
            row={row}
            categories={categories}
            onChange={(r) => setRow(i, r)}
            onRemove={() => removeRow(i)}
            disabled={disabled}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, newAccessoryDraft()])}
        disabled={disabled}
        className="h-8 px-4 rounded-full text-xs gap-1.5"
      >
        <Plus className="h-3 w-3 text-apple-blue" />
        <span>{t('transfers.addAccessories')}</span>
      </Button>
    </div>
  );
}
