import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFormFooter, FormError, SelectField,
} from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useLocations } from '@/entities/location';
import { useStartStockCount } from '@/entities/stock-count';

/** Dialog to open a stock count for a location; navigates to the new count on success. */
export function StartCountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [locationId, setLocationId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { data: locations = [] } = useLocations();
  const { mutate: start, isPending } = useStartStockCount();

  const submit = () => {
    setError(null);
    if (!locationId) return setError(t('stockCount.locationRequired'));
    start({ locationId }, {
      onSuccess: (count) => {
        onOpenChange(false);
        navigate(`/stock-counts/${count.id}`);
      },
      onError: (err) => setError(getApiErrorMessage(err) ?? t('common.error')),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-7">
        <DialogHeader>
          <DialogTitle>{t('stockCount.startCount')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4 pt-2">
          <FormError message={error} />
          <SelectField
            label={t('stockCount.location')}
            required
            value={locationId ? String(locationId) : ''}
            onValueChange={(v) => setLocationId(Number(v))}
            placeholder={t('stockCount.selectLocation')}
            options={locations.map((l) => ({ value: String(l.id), label: l.name }))}
            disabled={isPending}
          />
          <DialogFormFooter onClose={() => onOpenChange(false)} isPending={isPending} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
