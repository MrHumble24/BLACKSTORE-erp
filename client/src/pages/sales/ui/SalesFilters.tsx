import { useTranslation } from 'react-i18next';
import { Input, SelectField, Button } from '@/shared/ui';
import { useLocations } from '@/entities/location';
import { useCustomers } from '@/entities/customer';
import type { SaleStatus, SaleFilters as SaleFiltersType } from '@/entities/sale';

interface SalesDateFiltersProps {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
}

function SalesDateFilters({ from, to, onChange }: SalesDateFiltersProps) {
  const { t } = useTranslation();
  return (
    <>
      <Input
        type="date"
        value={from ?? ''}
        onChange={(e) => onChange(e.target.value || undefined, to)}
        placeholder={t('sales.filterFrom')}
        className="h-10 text-xs"
      />
      <Input
        type="date"
        value={to ?? ''}
        onChange={(e) => onChange(from, e.target.value || undefined)}
        placeholder={t('sales.filterTo')}
        className="h-10 text-xs"
      />
    </>
  );
}

function useSalesFilterOptions() {
  const { t } = useTranslation();
  const { data: locations = [] } = useLocations();
  const { data: customerPage } = useCustomers('', 1, 100);

  const statusOptions = [
    { value: '', label: t('sales.filterAllStatuses') },
    { value: 'PAID', label: t('sales.status.PAID') },
    { value: 'DEBT', label: t('sales.status.DEBT') },
    { value: 'RETURNED', label: t('sales.status.RETURNED') },
  ];

  const confirmedOptions = [
    { value: '', label: t('sales.filterAll') },
    { value: 'false', label: t('sales.statusWaiting') },
    { value: 'true', label: t('sales.statusConfirmed') },
  ];

  const locationOptions = [
    { value: '', label: t('sales.filterAllLocations') },
    ...locations.map((loc) => ({ value: String(loc.id), label: loc.name })),
  ];

  const customerOptions = [
    { value: '', label: t('sales.filterCustomer') },
    ...(customerPage?.items ?? []).map((c) => ({ value: String(c.id), label: `${c.name} (${c.phone})` })),
  ];

  return { statusOptions, confirmedOptions, locationOptions, customerOptions };
}

interface SalesFiltersProps {
  filters: SaleFiltersType;
  onFilterChange: (newFilters: SaleFiltersType) => void;
}

/** Filter bar for sales list with quick debt filter and customer/location/status/date selectors. */
export function SalesFilters({ filters, onFilterChange }: SalesFiltersProps) {
  const { t } = useTranslation();
  const { statusOptions, confirmedOptions, locationOptions, customerOptions } = useSalesFilterOptions();
  const isDebtsOnly = filters.status === 'DEBT';

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Button
          type="button"
          size="sm"
          variant={isDebtsOnly ? 'default' : 'outline'}
          onClick={() => onFilterChange({ ...filters, status: isDebtsOnly ? undefined : 'DEBT' })}
          className="text-xs h-8"
        >
          {t('sales.quickDebts')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-end">
        <SelectField
          label={t('sales.filterStatus')}
          value={filters.status ?? ''}
          onValueChange={(val: string) => onFilterChange({ ...filters, status: (val as SaleStatus) || undefined })}
          options={statusOptions}
          placeholder={t('sales.filterStatus')}
        />
        <SelectField
          label={t('sales.filterConfirmation')}
          value={filters.confirmed === undefined ? '' : String(filters.confirmed)}
          onValueChange={(val: string) => onFilterChange({ ...filters, confirmed: val ? val === 'true' : undefined })}
          options={confirmedOptions}
          placeholder={t('sales.filterConfirmation')}
        />
        <SelectField
          label={t('sales.filterLocation')}
          value={filters.locationId ? String(filters.locationId) : ''}
          onValueChange={(val: string) => onFilterChange({ ...filters, locationId: val ? Number(val) : undefined })}
          options={locationOptions}
          placeholder={t('sales.filterLocation')}
        />
        <SelectField
          label={t('sales.filterCustomer')}
          value={filters.customerId ? String(filters.customerId) : ''}
          onValueChange={(val: string) => onFilterChange({ ...filters, customerId: val ? Number(val) : undefined })}
          options={customerOptions}
          placeholder={t('sales.filterCustomer')}
        />
        <SalesDateFilters
          from={filters.from}
          to={filters.to}
          onChange={(from, to) => onFilterChange({ ...filters, from, to })}
        />
      </div>
    </div>
  );
}
