import { Label } from './label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './select';
import { SearchableSelect, type SearchableOption } from './SearchableSelect';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  keywords?: string[];
}

export interface SelectFieldProps {
  label: string;
  required?: boolean;
  value?: string;
  onValueChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  allowCustom?: boolean;
  onCustomValue?: (val: string) => void;
}

/** Form select field combining Label, Select dropdown (or searchable combobox), and inline error text. */
export function SelectField({
  label,
  required,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  error,
  disabled,
  className,
  searchable,
  allowCustom,
  onCustomValue,
}: SelectFieldProps) {
  if (searchable) {
    return (
      <SearchableSelect
        label={label}
        required={required}
        value={value}
        onValueChange={onValueChange}
        options={options as SearchableOption[]}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        error={error}
        disabled={disabled}
        className={className}
        allowCustom={allowCustom}
        onCustomValue={onCustomValue}
      />
    );
  }

  return (
    <div className={className ?? 'space-y-1'}>
      <Label>
        {label} {required && '*'}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={error ? 'border-launch-orange' : ''}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-launch-orange font-medium">{error}</p>}
    </div>
  );
}
