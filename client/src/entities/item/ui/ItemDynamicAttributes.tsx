import { useTranslation } from 'react-i18next';
import type { FieldErrors } from 'react-hook-form';
import { Input, Label, SelectField } from '@/shared/ui';
import type { CategoryAttribute } from '@/entities/category';
import type { ItemFormValues } from '../model/item.schema';

const COMMON_COLOR_OPTIONS = [
  'Natural Titanium',
  'Desert Titanium',
  'Black Titanium',
  'White Titanium',
  'Space Black',
  'Silver',
  'Gold',
  'Deep Purple',
  'Midnight',
  'Starlight',
  'Blue',
  'Black',
  'White',
  'Pink',
  'Green',
  'Yellow',
  'Red',
  'Purple',
];

interface FieldProps {
  attr: CategoryAttribute;
  val: string;
  errorMsg?: string;
  onChange: (key: string, value: string) => void;
  disabled: boolean;
}

function AttributeField({ attr, val, errorMsg, onChange, disabled }: FieldProps) {
  // If predefined options exist, provide a searchable select with custom value fallback.
  if (attr.options && attr.options.length > 0) {
    return (
      <SelectField
        searchable
        allowCustom
        onCustomValue={(newVal) => onChange(attr.key, newVal)}
        label={attr.label}
        required={attr.required}
        value={val}
        onValueChange={(newVal) => onChange(attr.key, newVal)}
        disabled={disabled}
        placeholder={attr.label}
        error={errorMsg}
        options={attr.options.map((opt) => ({ value: opt, label: opt }))}
      />
    );
  }

  // Common text attributes like Color get searchable quick-select suggestions.
  if (attr.type === 'TEXT' && attr.key.toLowerCase().includes('color')) {
    return (
      <SelectField
        searchable
        allowCustom
        onCustomValue={(newVal) => onChange(attr.key, newVal)}
        label={attr.label}
        required={attr.required}
        value={val}
        onValueChange={(newVal) => onChange(attr.key, newVal)}
        disabled={disabled}
        placeholder={attr.label}
        error={errorMsg}
        options={COMMON_COLOR_OPTIONS.map((c) => ({ value: c, label: c }))}
      />
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={`attr-${attr.key}`}>
        {attr.label} {attr.required && '*'}
      </Label>
      <Input
        id={`attr-${attr.key}`}
        type={attr.type === 'NUMBER' ? 'number' : 'text'}
        value={val}
        onChange={(e) => onChange(attr.key, e.target.value)}
        placeholder={attr.label}
        disabled={disabled}
        className={errorMsg ? 'border-launch-orange' : ''}
      />
      {errorMsg && <p className="text-xs text-launch-orange font-medium">{errorMsg}</p>}
    </div>
  );
}

interface ItemDynamicAttributesProps {
  attributes: CategoryAttribute[];
  values: Record<string, string | number>;
  onChange: (key: string, value: string) => void;
  errors: FieldErrors<ItemFormValues>;
  disabled: boolean;
}

/** Dynamic form fields matching the selected category's attribute schema with searchable specs. */
export function ItemDynamicAttributes({
  attributes,
  values,
  onChange,
  errors,
  disabled,
}: ItemDynamicAttributesProps) {
  const { t } = useTranslation();
  if (attributes.length === 0) return null;

  const sortedAttributes = [...attributes].sort((a, b) => a.sortOrder - b.sortOrder);
  const attrErrors = errors.attributes as Record<string, { message?: string }> | undefined;

  return (
    <div className="space-y-3 pt-1 border-t border-hairline-silver/60">
      <div className="text-xs font-semibold text-ink tracking-tight uppercase">
        {t('items.attributes')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedAttributes.map((attr) => (
          <AttributeField
            key={attr.id}
            attr={attr}
            val={values[attr.key] !== undefined ? String(values[attr.key]) : ''}
            errorMsg={attrErrors?.[attr.key]?.message}
            onChange={onChange}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
