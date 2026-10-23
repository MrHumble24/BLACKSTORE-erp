import type { useSellCart } from '../lib/useSellCart';
import { SellLocationSelect } from './SellLocationSelect';
import { SellScanInput } from './SellScanInput';
import { SellLinesTable } from './SellLinesTable';
import { SellAccessoryRow } from './SellAccessoryRow';

interface SellCartPanelProps {
  locationId: number | null;
  onLocationChange: (id: number) => void;
  cart: ReturnType<typeof useSellCart>;
}

/** Left panel containing location select, scanner, item table, and accessory row. */
export function SellCartPanel({
  locationId,
  onLocationChange,
  cart,
}: SellCartPanelProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
        <SellLocationSelect
          locationId={locationId}
          onLocationChange={onLocationChange}
        />
        <SellScanInput
          locationId={locationId}
          onAddDevice={cart.addDevice}
          existingItemIds={cart.existingItemIds}
        />
      </div>

      <SellLinesTable
        lines={cart.lines}
        onUpdateLinePrice={cart.updatePrice}
        onUpdateWarranty={cart.updateWarranty}
        onRemoveLine={cart.removeLine}
      />

      <SellAccessoryRow
        locationId={locationId}
        onAddAccessory={cart.addAccessory}
      />
    </div>
  );
}
