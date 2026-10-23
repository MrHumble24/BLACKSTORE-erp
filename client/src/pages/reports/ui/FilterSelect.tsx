import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui';

interface FilterSelectProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

/** Compact pill select for report filters; the "ALL" entry means no filter. */
export function FilterSelect({ value, placeholder, onChange, options }: FilterSelectProps) {
  return (
    <div className="w-40">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs rounded-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{placeholder}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
