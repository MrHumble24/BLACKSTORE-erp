import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useLocations, type Location } from '@/entities/location';
import { LocationFormDialog } from '@/features/manage-locations';
import { LocationsTable } from './LocationsTable';

/**
 * Master data page for locations (warehouse and shop), gated by manage_catalog.
 */
export function LocationsPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);

  const { data: locations = [], isLoading } = useLocations(true);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (location: Location) => {
    setEditing(location);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {t('locations.title')}
          </h1>
          <p className="text-xs text-slate">{t('locations.subtitle')}</p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-pricing-blue hover:bg-[#0077ed] text-gallery-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('locations.addLocation')}</span>
        </Button>
      </div>

      <LocationsTable locations={locations} isLoading={isLoading} onEdit={openEdit} />

      <LocationFormDialog open={open} onOpenChange={setOpen} location={editing} />
    </div>
  );
}
