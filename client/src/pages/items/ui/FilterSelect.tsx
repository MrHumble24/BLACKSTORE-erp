import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui';
import { cn } from '@/shared/lib';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
  triggerClassName?: string;
}

/** Reusable pill-styled filter select with active-filter styling. */
export function FilterSelect({
  value,
  placeholder,
  onChange,
  options,
  className,
  triggerClassName,
}: FilterSelectProps) {
  const isFiltered = value !== 'ALL';

  return (
    <div className={cn('w-full sm:w-auto', className)}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            'h-8 text-xs rounded-full border-hairline-silver/70 transition-colors w-full sm:w-auto sm:min-w-[9.5rem] [&>span]:truncate',
            isFiltered
              ? 'bg-studio-mist font-medium text-ink border-steel/60 dark:bg-white/[0.08]'
              : 'bg-gallery-white text-slate dark:bg-white/[0.02]',
            triggerClassName,
          )}
        >
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
    </div>
  );
}
