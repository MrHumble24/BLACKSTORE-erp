import { useTranslation } from 'react-i18next';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input, Label } from '@/shared/ui';
import type { ItemFormValues } from '../model/item.schema';

type IdentifierName = 'imei' | 'imei2' | 'serial';

interface IdentifierFieldSpec {
  name: IdentifierName;
  label: string;
  placeholder: string;
  error?: string;
}

/** Merges RHF's blur with an optional external handler (walk-in duplicate warning). */
function IdentifierField({
  name,
  label,
  placeholder,
  error,
  register,
  disabled,
  onBlurField,
}: IdentifierFieldSpec & {
  register: UseFormRegister<ItemFormValues>;
  disabled: boolean;
  onBlurField?: (value: string) => void;
}) {
  const reg = register(name);
  return (
    <div className="space-y-1">
      <Label htmlFor={`item-${name}`}>{label}</Label>
      <Input
        id={`item-${name}`}
        placeholder={placeholder}
        disabled={disabled}
        className={error ? 'border-launch-orange' : ''}
        {...reg}
        onBlur={(e) => {
          reg.onBlur(e);
          onBlurField?.(e.currentTarget.value);
        }}
      />
      {error && <p className="text-xs text-launch-orange font-medium">{error}</p>}
    </div>
  );
}

interface ItemIdentifierInputsProps {
  register: UseFormRegister<ItemFormValues>;
  errors: FieldErrors<ItemFormValues>;
  disabled: boolean;
  /** Called with (field, typed value) when an identifier field loses focus (FR-25 check). */
  onIdentifierBlur?: (name: IdentifierName, value: string) => void;
}

/** Form inputs for device hardware identifiers (IMEI 1, IMEI 2, Serial). */
export function ItemIdentifierInputs({
  register,
  errors,
  disabled,
  onIdentifierBlur,
}: ItemIdentifierInputsProps) {
  const { t } = useTranslation();

  const blurFor = (name: IdentifierName) =>
    onIdentifierBlur ? (value: string) => onIdentifierBlur(name, value) : undefined;

  const fields: IdentifierFieldSpec[] = [
    { name: 'imei', label: t('items.imei1'), placeholder: t('items.placeholderImei'), error: errors.imei?.message },
    { name: 'imei2', label: t('items.imei2'), placeholder: t('items.placeholderImei2'), error: errors.imei2?.message },
    { name: 'serial', label: t('items.serial'), placeholder: t('items.placeholderSerial'), error: errors.serial?.message },
  ];

  return (
    <div className="space-y-3 pt-1 border-t border-hairline-silver/60">
      <div className="text-xs font-semibold text-ink tracking-tight uppercase">
        {t('items.identifiers')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {fields.map((f) => (
          <IdentifierField
            key={f.name}
            {...f}
            register={register}
            disabled={disabled}
            onBlurField={blurFor(f.name)}
          />
        ))}
      </div>
    </div>
  );
}
