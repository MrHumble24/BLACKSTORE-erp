import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input, DateRangeInputs,
} from '@/shared/ui';
import type { LedgerFilters, LedgerType, ExpenseStatus } from '@/entities/ledger';

interface FilterOption {
  value: string;
  labelKey: string;
}

const TYPE_OPTIONS: FilterOption[] = [
  { value: 'ALL', labelKey: 'ledger.allTypes' },
  { value: 'INCOME', labelKey: 'ledger.income' },
  { value: 'EXPENSE', labelKey: 'ledger.expense' },
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'ALL', labelKey: 'ledger.statusAll' },
  { value: 'PENDING', labelKey: 'ledger.statusPending' },
  { value: 'CONFIRMED', labelKey: 'ledger.statusConfirmed' },
  { value: 'EXCLUDED', labelKey: 'ledger.statusExcluded' },
];

interface FilterSelectProps {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

/** Compact pill select shared by the type and status filters. */
function FilterSelect({ value, options, onChange }: FilterSelectProps) {
  const { t } = useTranslation();
  return (
    <div className="w-full sm:w-40">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs rounded-full w-full">
          <SelectValue placeholder={t(options[0].labelKey)} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{t(option.labelKey)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface Props {
  filters: LedgerFilters;
  onChange: (filters: LedgerFilters) => void;
}

/** Type, expense status, category and from/to date filters for the ledger. */
export function ExpensesFilters({ filters, onChange }: Props) {
  const { t } = useTranslation();
  const [category, setCategory] = useState(filters.category ?? '');

  const submitCategory = () => {
    const trimmed = category.trim();
    if (trimmed !== (filters.category ?? '')) onChange({ ...filters, category: trimmed || undefined });
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1 w-full sm:w-auto">
      <FilterSelect
        value={filters.type ?? 'ALL'}
        options={TYPE_OPTIONS}
        onChange={(v) => onChange({ ...filters, type: v === 'ALL' ? undefined : (v as LedgerType) })}
      />
      <FilterSelect
        value={filters.status ?? 'ALL'}
        options={STATUS_OPTIONS}
        onChange={(v) => onChange({ ...filters, status: v === 'ALL' ? undefined : (v as ExpenseStatus) })}
      />
      <Input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onBlur={submitCategory}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCategory(); } }}
        placeholder={t('ledger.category')}
        className="w-full sm:w-44 h-8 text-xs rounded-full"
      />
      <DateRangeInputs from={filters.from} to={filters.to} onChange={(r) => onChange({ ...filters, ...r })} />
    </div>
  );
}
