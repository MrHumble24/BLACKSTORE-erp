import { useTranslation } from 'react-i18next';
import { Label, Input } from '@/shared/ui';

interface Props {
  quantity: string;
  onQuantityChange: (val: string) => void;
  unitCost: string;
  onUnitCostChange: (val: string) => void;
  canManagePrices: boolean;
  disabled: boolean;
}

/** Input fields for quantity and unit cost in accessory stock entry. */
export function AccessoryQtyFields({
  quantity,
  onQuantityChange,
  unitCost,
  onUnitCostChange,
  canManagePrices,
  disabled,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label htmlFor="accessory-qty">
          {t('accessories.quantity')} *
        </Label>
        <Input
          id="accessory-qty"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          disabled={disabled}
        />
      </div>

      {canManagePrices && (
        <div className="space-y-1">
          <Label htmlFor="accessory-cost">
            {t('accessories.unitCost')}
          </Label>
          <Input
            id="accessory-cost"
            placeholder="0.00"
            value={unitCost}
            onChange={(e) => onUnitCostChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
