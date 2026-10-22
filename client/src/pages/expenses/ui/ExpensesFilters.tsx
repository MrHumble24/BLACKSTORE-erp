import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input, DateRangeInputs,
} from '@/shared/ui';
import type { LedgerFilters, LedgerType } from '@/entities/ledger';

interface Props {
  filters: LedgerFilters;
  onChange: (filters: LedgerFilters) => void;
}

/** Type, category and from/to date filters for the ledger. */
export function ExpensesFilters({ filters, onChange }: Props) {
  const { t } = useTranslation();
  const [category, setCategory] = useState(filters.category ?? '');

  const submitCategory = () => {
    const trimmed = category.trim();
    if (trimmed !== (filters.category ?? '')) onChange({ ...filters, category: trimmed || undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1">
      <div className="w-40">
        <Select
          value={filters.type ?? 'ALL'}
          onValueChange={(v) => onChange({ ...filters, type: v === 'ALL' ? undefined : (v as LedgerType) })}
        >
          <SelectTrigger className="h-8 text-xs rounded-full">
            <SelectValue placeholder={t('ledger.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('ledger.allTypes')}</SelectItem>
            <SelectItem value="INCOME">{t('ledger.income')}</SelectItem>
            <SelectItem value="EXPENSE">{t('ledger.expense')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onBlur={submitCategory}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCategory(); } }}
        placeholder={t('ledger.category')}
        className="w-44 h-8 text-xs rounded-full"
      />
      <DateRangeInputs from={filters.from} to={filters.to} onChange={(r) => onChange({ ...filters, ...r })} />
    </div>
  );
}
