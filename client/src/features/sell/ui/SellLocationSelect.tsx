import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SelectField } from '@/shared/ui';
import { useLocations, type Location } from '@/entities/location';

const STORAGE_KEY = 'blackstore_sell_location_id';

interface SellLocationSelectProps {
  locationId: number | null;
  onLocationChange: (id: number) => void;
}

function useRememberedLocation(
  locationId: number | null,
  locations: Location[],
  onLocationChange: (id: number) => void,
) {
  useEffect(() => {
    if (locationId) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (locations.some((loc) => loc.id === parsed)) {
          onLocationChange(parsed);
          return;
        }
      }
    } catch {
      // Storage unavailable
    }
    if (locations.length > 0 && locations[0]) {
      onLocationChange(locations[0].id);
    }
  }, [locationId, locations, onLocationChange]);

  const handleChange = (val: string) => {
    const num = Number(val);
    onLocationChange(num);
    try {
      localStorage.setItem(STORAGE_KEY, String(num));
    } catch {
      // Storage unavailable
    }
  };

  return { handleChange };
}

/** Location selector with localStorage memory of the last active choice. */
export function SellLocationSelect({
  locationId,
  onLocationChange,
}: SellLocationSelectProps) {
  const { t } = useTranslation();
  const { data: locations = [] } = useLocations();
  const { handleChange } = useRememberedLocation(locationId, locations, onLocationChange);

  const options = locations.map((loc) => ({
    value: String(loc.id),
    label: loc.name,
  }));

  return (
    <div className="w-full sm:w-64">
      <SelectField
        label={t('sell.selectLocation')}
        value={locationId ? String(locationId) : ''}
        onValueChange={handleChange}
        options={options}
        placeholder={t('sell.chooseLocation')}
      />
    </div>
  );
}
