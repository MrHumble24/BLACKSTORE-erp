import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Badge, TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import { LocationActiveToggle, type Location } from '@/entities/location';

interface LocationsTableProps {
  locations: Location[];
  isLoading: boolean;
  onEdit: (location: Location) => void;
}

/** Single row of the locations table. */
function LocationRow({ location, onEdit }: { location: Location; onEdit: (l: Location) => void }) {
  const { t } = useTranslation();

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="font-medium text-ink tracking-[-0.016em]">{location.name}</TableCell>
      <TableCell className="text-xs text-slate tracking-[-0.01em]">
        {location.type === 'WAREHOUSE' ? t('locations.type.WAREHOUSE') : t('locations.type.SHOP')}
      </TableCell>
      <TableCell>
        <Badge variant={location.isActive ? 'active' : 'destructive'} className="px-2.5 py-0.5 text-[11px]">
          {location.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(location)}
            className="h-7.5 px-3 rounded-full border-hairline-silver bg-gallery-white text-apple-blue hover:bg-studio-mist hover:border-apple-blue/50 text-xs font-medium gap-1.5"
          >
            <Pencil className="h-3 w-3 text-apple-blue" />
            <span>{t('common.edit')}</span>
          </Button>
          <LocationActiveToggle location={location} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Apple-styled locations table with hairline borders. */
export function LocationsTable({ locations, isLoading, onEdit }: LocationsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('locations.name')}</TableHead>
            <TableHead>{t('locations.typeLabel')}</TableHead>
            <TableHead>{t('locations.status')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={4} />}
          {!isLoading && locations.length === 0 && (
            <TableEmptyRow colSpan={4} message={t('locations.noLocations')} />
          )}
          {!isLoading && locations.map((location) => (
            <LocationRow key={location.id} location={location} onEdit={onEdit} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
