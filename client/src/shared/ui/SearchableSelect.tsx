import { useState, useMemo, useRef, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Label } from './label';
import { cn } from '../lib/utils';

export interface SearchableOption {
  value: string;
  label: string;
  badge?: string;
  keywords?: string[];
}

export interface SearchableSelectProps {
  label?: string;
  required?: boolean;
  value?: string;
  onValueChange: (val: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean;
  onCustomValue?: (val: string) => void;
  triggerClassName?: string;
}

function matchesSearch(opt: SearchableOption, query: string): boolean {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const target = `${opt.label} ${opt.value} ${opt.badge ?? ''} ${opt.keywords?.join(' ') ?? ''}`.toLowerCase();
  return tokens.every((token) => target.includes(token));
}

interface TriggerProps {
  id: string;
  open: boolean;
  disabled?: boolean;
  error?: string;
  displayLabel: string;
  isPlaceholder: boolean;
  onClear: (e: React.MouseEvent) => void;
  showClear: boolean;
  triggerClassName?: string;
}

function SearchableTrigger({
  id,
  open,
  disabled,
  error,
  displayLabel,
  isPlaceholder,
  onClear,
  showClear,
  triggerClassName,
}: TriggerProps) {
  return (
    <PopoverTrigger asChild>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-[980px] border border-hairline-silver bg-gallery-white px-4 py-2 text-sm text-ink tracking-[-0.016em] transition-all hover:border-steel focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-control-gray disabled:opacity-60 cursor-pointer',
          error && 'border-launch-orange',
          triggerClassName,
        )}
      >
        <span className={cn('truncate', isPlaceholder && 'text-steel')}>{displayLabel}</span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {showClear && (
            <span
              role="button"
              tabIndex={-1}
              onClick={onClear}
              className="p-0.5 rounded-full hover:bg-control-gray/80 text-steel hover:text-ink cursor-pointer transition-colors"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-steel opacity-80" />
        </div>
      </button>
    </PopoverTrigger>
  );
}

interface SearchInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  onChange: (val: string) => void;
  onClear: () => void;
  placeholder?: string;
}

function SearchInput({ inputRef, query, onChange, onClear, placeholder }: SearchInputProps) {
  return (
    <div className="relative flex items-center px-1 pb-1 pt-0.5 border-b border-hairline-silver/60 mb-1">
      <Search className="absolute left-3.5 h-3.5 w-3.5 text-steel pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-xl bg-studio-mist/40 pl-8 pr-7 text-xs text-ink placeholder:text-steel focus:outline-none focus:bg-control-gray/40 transition-colors"
      />
      {query && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 p-0.5 text-steel hover:text-ink cursor-pointer"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

interface OptionRowProps {
  option: SearchableOption;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (val: string) => void;
}

function OptionRow({ option, isSelected, isHighlighted, onSelect }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={cn(
        'flex w-full cursor-pointer select-none items-center justify-between rounded-full py-2 pl-3 pr-3 text-xs tracking-[-0.01em] transition-colors',
        isSelected
          ? 'bg-control-gray/80 text-ink font-semibold'
          : isHighlighted
          ? 'bg-control-gray/50 text-ink'
          : 'text-ink hover:bg-control-gray/50',
      )}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <span className="truncate text-left">{option.label}</span>
        {option.badge && (
          <span className="text-[10px] text-slate font-mono shrink-0">{option.badge}</span>
        )}
      </div>
      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
    </button>
  );
}

interface OptionListProps {
  options: SearchableOption[];
  selectedValue?: string;
  highlightedIndex: number;
  onSelect: (val: string) => void;
  emptyText: string;
  allowCustom?: boolean;
  searchQuery: string;
  onSelectCustom?: (val: string) => void;
}

function OptionList({
  options,
  selectedValue,
  highlightedIndex,
  onSelect,
  emptyText,
  allowCustom,
  searchQuery,
  onSelectCustom,
}: OptionListProps) {
  const hasExact = options.some((o) => o.label.toLowerCase() === searchQuery.toLowerCase().trim());
  const showCustom = Boolean(allowCustom && searchQuery.trim() && !hasExact);

  if (options.length === 0 && !showCustom) {
    return <div className="p-3 text-center text-xs text-slate">{emptyText}</div>;
  }

  return (
    <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
      {showCustom && onSelectCustom && (
        <button
          type="button"
          onClick={() => onSelectCustom(searchQuery.trim())}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-apple-blue hover:bg-studio-mist/70 transition-colors"
        >
          <span className="truncate">Use &quot;{searchQuery.trim()}&quot;</span>
          <span className="text-[10px] uppercase font-semibold text-slate">Custom</span>
        </button>
      )}
      {options.map((opt, idx) => (
        <OptionRow
          key={opt.value}
          option={opt}
          isSelected={selectedValue === opt.value}
          isHighlighted={idx === highlightedIndex}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function useSearchableState(
  open: boolean,
  filteredCount: number,
  allowCustom?: boolean,
  searchQuery?: string,
  onSelect?: (val: string) => void,
) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchInputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent, onCustom?: () => void) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (filteredCount > 0 ? (prev + 1) % filteredCount : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (filteredCount > 0 ? (prev - 1 + filteredCount) % filteredCount : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCount > 0 && onSelect) {
        onSelect(String(highlightedIndex));
      } else if (allowCustom && searchQuery?.trim() && onCustom) {
        onCustom();
      }
    }
  };

  return { highlightedIndex, setHighlightedIndex, searchInputRef, handleKeyDown };
}

/**
 * Apple-styled searchable select (Combobox) with keyboard navigation and custom input support.
 */
export function SearchableSelect({
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
  allowCustom,
  onCustomValue,
  triggerClassName,
}: SearchableSelectProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(() => options.find((opt) => opt.value === value), [options, value]);
  const filteredOptions = useMemo(() => options.filter((opt) => matchesSearch(opt, searchQuery)), [options, searchQuery]);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setOpen(false);
  };

  const handleCustom = (val: string) => {
    if (onCustomValue) onCustomValue(val);
    else onValueChange(val);
    setOpen(false);
  };

  const { highlightedIndex, setHighlightedIndex, searchInputRef, handleKeyDown } = useSearchableState(
    open,
    filteredOptions.length,
    allowCustom,
    searchQuery,
    (idxStr) => {
      const idx = Number(idxStr);
      if (filteredOptions[idx]) handleSelect(filteredOptions[idx].value);
    },
  );

  const displayLabel = selectedOption ? selectedOption.label : value || placeholder || t('common.select');

  return (
    <div className={className ?? 'space-y-1'}>
      {label && <Label htmlFor={inputId}>{label} {required && '*'}</Label>}
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setSearchQuery('');
            setHighlightedIndex(0);
          }
        }}
      >
        <SearchableTrigger
          id={inputId}
          open={open}
          disabled={disabled}
          error={error}
          displayLabel={displayLabel}
          isPlaceholder={!selectedOption && !value}
          onClear={(e) => { e.stopPropagation(); onValueChange(''); }}
          showClear={Boolean(value && !disabled)}
          triggerClassName={triggerClassName}
        />
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[420px] p-1.5 shadow-xl bg-gallery-white"
          onKeyDown={(e) => handleKeyDown(e, () => handleCustom(searchQuery.trim()))}
        >
          <SearchInput
            inputRef={searchInputRef}
            query={searchQuery}
            onChange={(q) => { setSearchQuery(q); setHighlightedIndex(0); }}
            onClear={() => setSearchQuery('')}
            placeholder={searchPlaceholder ?? t('common.search')}
          />
          <OptionList
            options={filteredOptions}
            selectedValue={value}
            highlightedIndex={highlightedIndex}
            onSelect={handleSelect}
            emptyText={emptyText ?? t('common.noResults')}
            allowCustom={allowCustom}
            searchQuery={searchQuery}
            onSelectCustom={handleCustom}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-launch-orange font-medium">{error}</p>}
    </div>
  );
}
