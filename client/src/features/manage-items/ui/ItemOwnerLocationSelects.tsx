import { useTranslation } from 'react-i18next';
import { SelectField } from '@/shared/ui';
import { type Investor } from '@/entities/investor';
import { type Location } from '@/entities/location';
import { type ItemCondition } from '@/entities/item';

interface Props {
  investorId: number;
  onInvestorChange: (id: number) => void;
  investorError?: string;
  investors: Investor[];
  locationId: number;
  onLocationChange: (id: number) => void;
  locationError?: string;
  locations: Location[];
  condition: ItemCondition;
  onConditionChange: (condition: ItemCondition) => void;
  disabled: boolean;
}

/** Dropdowns for selecting Owner (Investor), Location, and Condition. */
export function ItemOwnerLocationSelects({
  investorId,
  onInvestorChange,
  investorError,
  investors,
  locationId,
  onLocationChange,
  locationError,
  locations,
  condition,
  onConditionChange,
  disabled,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <SelectField
        label={t('items.owner')}
        required
        value={investorId ? String(investorId) : ''}
        onValueChange={(val) => onInvestorChange(Number(val))}
        disabled={disabled}
        placeholder={t('items.selectOwner')}
        error={investorError}
        options={investors.map((i) => ({
          value: String(i.id),
          label: `${i.name} (${i.code})`,
        }))}
      />
      <SelectField
        label={t('items.location')}
        required
        value={locationId ? String(locationId) : ''}
        onValueChange={(val) => onLocationChange(Number(val))}
        disabled={disabled}
        placeholder={t('items.selectLocation')}
        error={locationError}
        options={locations.map((l) => ({
          value: String(l.id),
          label: l.name,
        }))}
      />
      <SelectField
        label={t('items.conditionLabel')}
        required
        value={condition}
        onValueChange={(val) => onConditionChange(val as ItemCondition)}
        disabled={disabled}
        options={[
          { value: 'NEW', label: t('items.condition.NEW') },
          { value: 'USED', label: t('items.condition.USED') },
          { value: 'REFURBISHED', label: t('items.condition.REFURBISHED') },
        ]}
      />
    </div>
  );
}
