import { useTranslation } from 'react-i18next';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input,
} from '@/shared/ui';
import { useLocations } from '@/entities/location';
import type { TransferFilters } from '@/entities/transfer';

interface Props {
  filters: TransferFilters;
  onChange: (filters: TransferFilters) => void;
}

/** Location + from/to date filter bar for the transfers list. */
export function TransfersFilters({ filters, onChange }: Props) {
  const { t } = useTranslation();
  const { data: locations = [] } = useLocations();

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1">
      <div className="w-44">
        <Select
          value={filters.locationId ? String(filters.locationId) : 'ALL'}
          onValueChange={(v) => onChange({ ...filters, locationId: v === 'ALL' ? undefined : Number(v) })}
        >
          <SelectTrigger className="h-8 text-xs rounded-full">
            <SelectValue placeholder={t('transfers.allLocations')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('transfers.allLocations')}</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        type="date"
        value={filters.from ?? ''}
        onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
        className="w-40 h-8 text-xs rounded-full"
      />
      <Input
        type="date"
        value={filters.to ?? ''}
        onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
        className="w-40 h-8 text-xs rounded-full"
      />
    </div>
  );
}
