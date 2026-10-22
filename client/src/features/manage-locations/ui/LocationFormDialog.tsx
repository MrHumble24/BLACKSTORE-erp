import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import type { Location } from '@/entities/location';
import { LocationFormContent } from './LocationFormContent';

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location | null;
}

/** Dialog for creating a new location or editing an existing one. */
export function LocationFormDialog({ open, onOpenChange, location }: LocationFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-7">
        <DialogHeader>
          <DialogTitle>
            {location ? t('locations.editLocation') : t('locations.addLocation')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <LocationFormContent
            key={location ? `edit-${location.id}` : 'create'}
            location={location ?? null}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
