import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Input, CameraScanButton } from '@/shared/ui';
import { useItemByCode, SCAN_CODE_REGEX, type Item } from '@/entities/item';
import type { DeviceCartLine } from '../model/types';

interface SellScanInputProps {
  locationId: number | null;
  onAddDevice: (line: DeviceCartLine) => void;
  existingItemIds: number[];
}

function validateScannedItem(
  item: Item,
  locationId: number | null,
  existingItemIds: number[],
  t: (key: string) => string,
): string | null {
  if (existingItemIds.includes(item.id)) return t('sell.duplicateItem');
  if (item.status !== 'IN_STOCK') return t('sell.itemNotInStock');
  if (locationId && item.location.id !== locationId) return t('sell.itemWrongLocation');
  return null;
}

function useScanLookup(
  locationId: number | null,
  existingItemIds: number[],
  onAddDevice: (line: DeviceCartLine) => void,
) {
  const { t } = useTranslation();
  const { mutate: lookupItem, isPending } = useItemByCode();

  const handleScan = (codeToScan: string, onReset: () => void) => {
    const trimmed = codeToScan.trim().toUpperCase();
    if (!trimmed) return;
    if (!SCAN_CODE_REGEX.test(trimmed)) {
      toast.error(t('sell.invalidScanCode'));
      return;
    }

    lookupItem(trimmed, {
      onSuccess: (item) => {
        const err = validateScannedItem(item, locationId, existingItemIds, t);
        if (err) {
          toast.error(err);
          return;
        }
        onAddDevice({
          type: 'device',
          itemId: item.id,
          modelName: item.productModel.name,
          code: trimmed,
          ownerName: item.investor.name,
          minSalePrice: item.minSalePrice,
          unitPrice: item.salePrice ?? '',
          warrantyUntil: '',
        });
        onReset();
      },
      onError: () => toast.error(t('sell.itemNotFound')),
    });
  };

  return { handleScan, isPending };
}

/** Dedicated scan input for sales cart with Enter key lookup and camera scan. */
export function SellScanInput({
  locationId,
  onAddDevice,
  existingItemIds,
}: SellScanInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleScan, isPending } = useScanLookup(locationId, existingItemIds, onAddDevice);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(value, () => setValue(''));
    }
  };

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('sell.scanPlaceholder')}
        disabled={isPending}
        className="pr-20 h-10 text-sm font-mono tracking-tight"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-slate" />}
        <CameraScanButton onScan={(code) => handleScan(code, () => setValue(''))} />
      </div>
    </div>
  );
}
