import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ActiveToggleButton } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useUpdateLocation } from '../api';
import type { Location } from '../model/types';

interface LocationActiveToggleProps {
  location: Location;
}

/** Activates or deactivates a location instead of deleting it (BR-12). */
export function LocationActiveToggle({ location }: LocationActiveToggleProps) {
  const { t } = useTranslation();
  const { mutate: update, isPending } = useUpdateLocation();

  const handleToggle = () => {
    update(
      { id: location.id, payload: { isActive: !location.isActive } },
      {
        onSuccess: () => toast.success(t('locations.updatedSuccess')),
        onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  };

  return (
    <ActiveToggleButton
      isActive={location.isActive}
      isPending={isPending}
      onToggle={handleToggle}
    />
  );
}
