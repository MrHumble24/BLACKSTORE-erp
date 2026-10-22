import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ScanCodeInput } from '@/shared/ui';
import type { ItemBrief } from '@/entities/transfer';
import { useScanToAdd } from '../model/useScanToAdd';

/** One scanned device row with a remove button. */
function ScannedRow({ item, onRemove }: { item: ItemBrief; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 px-3 py-2">
      <span className="text-xs text-ink">
        <span className="font-medium">{item.productModel.name}</span>
        <span className="text-slate"> · {item.identifiers[0]?.value ?? `#${item.id}`}</span>
      </span>
      <button type="button" onClick={onRemove} className="text-slate hover:text-launch-orange">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface Props {
  fromLocationId: number;
  items: ItemBrief[];
  onAdd: (item: ItemBrief) => void;
  onRemove: (id: number) => void;
  disabled: boolean;
}

/** Scan input that adds IN_STOCK-at-source devices to the transfer, plus the scanned list. */
export function TransferItemScan({ fromLocationId, items, onAdd, onRemove, disabled }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleScan } = useScanToAdd({
    fromLocationId,
    items,
    onAdd,
    reset: () => { setCode(''); inputRef.current?.focus(); },
  });

  return (
    <div className="space-y-2">
      <ScanCodeInput
        id="transfer-scan"
        label={t('transfers.scanItems')}
        value={code}
        onChange={setCode}
        onSubmit={handleScan}
        inputRef={inputRef}
        placeholder={t('transfers.scanPlaceholder')}
        disabled={disabled}
      />
      <div className="space-y-1.5">
        {items.map((item) => (
          <ScannedRow key={item.id} item={item} onRemove={() => onRemove(item.id)} />
        ))}
      </div>
    </div>
  );
}
