import { Label } from './label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './select';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  required?: boolean;
  value?: string;
  onValueChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/** Form select field combining Label, Select dropdown, and inline error text. */
export function SelectField({
  label,
  required,
  value,
  onValueChange,
  options,
  placeholder,
  error,
  disabled,
  className,
}: SelectFieldProps) {
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
