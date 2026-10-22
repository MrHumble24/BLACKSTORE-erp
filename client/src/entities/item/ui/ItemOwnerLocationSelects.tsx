import { useTranslation } from 'react-i18next';
import { SelectField } from '@/shared/ui';
import type { Investor } from '@/entities/investor';
import type { Location } from '@/entities/location';
import type { ItemCondition } from '../model/types';

/** Owner (investor) dropdown with business code appended. */
function InvestorSelect({
  investorId, onInvestorChange, investorError, investors, disabled,
}: {
  investorId: number;
  onInvestorChange: (id: number) => void;
  investorError?: string;
  investors: Investor[];
  disabled: boolean;
}) {
  const { t } = useTranslation();

  return (
    <SelectField
      label={t('items.owner')}
      required
      value={investorId ? String(investorId) : ''}
      onValueChange={(val) => onInvestorChange(Number(val))}
      disabled={disabled}
      placeholder={t('items.selectOwner')}
      error={investorError}
      options={investors.map((i) => ({ value: String(i.id), label: `${i.name} (${i.code})` }))}
    />
  );
}

/** Storage location dropdown. */
function LocationSelect({
  locationId, onLocationChange, locationError, locations, disabled,
}: {
  locationId: number;
  onLocationChange: (id: number) => void;
  locationError?: string;
  locations: Location[];
  disabled: boolean;
}) {
  const { t } = useTranslation();

  return (
    <SelectField
      label={t('items.location')}
      required
      value={locationId ? String(locationId) : ''}
      onValueChange={(val) => onLocationChange(Number(val))}
      disabled={disabled}
      placeholder={t('items.selectLocation')}
      error={locationError}
      options={locations.map((l) => ({ value: String(l.id), label: l.name }))}
    />
  );
}

/** Owner (investor) and location dropdowns. */
function OwnerLocationFields({
  investorId,
  onInvestorChange,
  investorError,
  investors,
  locationId,
  onLocationChange,
  locationError,
  locations,
  disabled,
}: {
  investorId: number;
  onInvestorChange: (id: number) => void;
  investorError?: string;
  investors: Investor[];
  locationId: number;
  onLocationChange: (id: number) => void;
  locationError?: string;
  locations: Location[];
  disabled: boolean;
}) {
  return (
    <>
      <InvestorSelect
        investorId={investorId}
        onInvestorChange={onInvestorChange}
        investorError={investorError}
        investors={investors}
        disabled={disabled}
      />
      <LocationSelect
        locationId={locationId}
        onLocationChange={onLocationChange}
        locationError={locationError}
        locations={locations}
        disabled={disabled}
      />
    </>
  );
}

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
export function ItemOwnerLocationSelects(props: Props) {
  const { t } = useTranslation();
  const { condition, onConditionChange, disabled } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <OwnerLocationFields {...props} />
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
