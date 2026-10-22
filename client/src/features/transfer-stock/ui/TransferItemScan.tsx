import { useState, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Input, Label } from '@/shared/ui';
import { getApiErrorStatus } from '@/shared/api';
import { useItemByCode, SCAN_CODE_REGEX, type Item } from '@/entities/item';
import { CameraScanButton } from '@/features/scan';
import type { ItemBrief } from '@/entities/transfer';

/** Reduces a scanned item to the brief the transfer list shows and sends. */
function toBrief(item: Item): ItemBrief {
  return {
    id: item.id,
    identifiers: item.identifiers,
    productModel: { id: item.productModel.id, name: item.productModel.name },
    status: item.status,
    location: { id: item.location.id, name: item.location.name },
  };
}

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
  const { mutate: lookup, isPending } = useItemByCode();

  const handleScan = (raw: string) => {
    if (isPending) return;
    const trimmed = raw.trim();
    if (!trimmed || !SCAN_CODE_REGEX.test(trimmed)) return;
    if (!fromLocationId) {
      toast.error(t('transfers.selectFromFirst'));
      return;
    }
    lookup(trimmed, {
      onSuccess: (item) => {
        setCode('');
        inputRef.current?.focus();
        if (item.status !== 'IN_STOCK' || item.location.id !== fromLocationId) {
          toast.error(t('transfers.itemNotAtSource'));
        } else if (items.some((i) => i.id === item.id)) {
          toast.error(t('transfers.itemAlreadyAdded'));
        } else {
          onAdd(toBrief(item));
        }
      },
      onError: (err) => {
        setCode('');
        inputRef.current?.focus();
        toast.error(getApiErrorStatus(err) === 404 ? t('scan.notFound') : t('common.error'));
      },
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(code);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="transfer-scan">{t('transfers.scanItems')}</Label>
      <div className="flex items-center gap-2">
        <Input
          id="transfer-scan"
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('transfers.scanPlaceholder')}
          autoComplete="off"
          disabled={disabled}
        />
        <CameraScanButton onScan={(c) => { setCode(c); handleScan(c); }} />
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <ScannedRow key={item.id} item={item} onRemove={() => onRemove(item.id)} />
        ))}
      </div>
    </div>
  );
}
