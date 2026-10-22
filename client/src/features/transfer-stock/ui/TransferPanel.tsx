import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button, SelectField, FormError, Label, Input } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useLocations } from '@/entities/location';
import { useCategories } from '@/entities/category';
import { useCreateTransfer, type ItemBrief, type CreateTransferPayload } from '@/entities/transfer';
import { TransferItemScan } from './TransferItemScan';
import { TransferAccessoryRows } from './TransferAccessoryRows';
import type { AccessoryDraft } from '../model/accessory-draft';

/** Turns the drafted accessory rows into API lines, dropping blank/invalid ones. */
function toAccessoryLines(rows: AccessoryDraft[]) {
  return rows
    .map((r) => ({ productModelId: r.productModelId, quantity: Number(r.quantity) }))
    .filter((l) => l.productModelId > 0 && Number.isInteger(l.quantity) && l.quantity > 0);
}

/** From/to location selects for the transfer. */
function LocationSelects({
  locations,
  fromId,
  toId,
  onFrom,
  onTo,
  disabled,
}: {
  locations: { id: number; name: string }[];
  fromId: number;
  toId: number;
  onFrom: (id: number) => void;
  onTo: (id: number) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const options = locations.map((l) => ({ value: String(l.id), label: l.name }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SelectField label={t('transfers.from')} required value={fromId ? String(fromId) : ''}
        onValueChange={(v) => onFrom(Number(v))} options={options}
        placeholder={t('transfers.selectLocation')} disabled={disabled} />
      <SelectField label={t('transfers.to')} required value={toId ? String(toId) : ''}
        onValueChange={(v) => onTo(Number(v))} options={options}
        placeholder={t('transfers.selectLocation')} disabled={disabled} />
    </div>
  );
}

/** Transfer builder: pick from/to, scan devices, add accessory lines, note, then submit (W6). */
export function TransferPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fromId, setFromId] = useState(0);
  const [toId, setToId] = useState(0);
  const [items, setItems] = useState<ItemBrief[]>([]);
  const [rows, setRows] = useState<AccessoryDraft[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: locations = [] } = useLocations();
  const { data: categories = [] } = useCategories();
  const nonSerialized = categories.filter((c) => !c.isSerialized);
  const { mutate: createTransfer, isPending } = useCreateTransfer();

  const submit = () => {
    setError(null);
    if (!fromId || !toId) return setError(t('transfers.locationsRequired'));
    if (fromId === toId) return setError(t('transfers.locationsMustDiffer'));
    const accessories = toAccessoryLines(rows);
    if (items.length === 0 && accessories.length === 0) return setError(t('transfers.atLeastOneLine'));

    const payload: CreateTransferPayload = {
      fromLocationId: fromId,
      toLocationId: toId,
      ...(items.length ? { itemIds: items.map((i) => i.id) } : {}),
      ...(accessories.length ? { accessories } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    createTransfer(payload, {
      onSuccess: (transfer) => {
        toast.success(t('transfers.createdSuccess'));
        navigate(`/transfers/${transfer.id}`);
      },
      onError: (err) => setError(getApiErrorMessage(err) ?? t('common.error')),
    });
  };

  return (
    <div className="space-y-5 rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6">
      <FormError message={error} />
      <LocationSelects locations={locations} fromId={fromId} toId={toId}
        onFrom={(id) => { setFromId(id); setItems([]); }} onTo={setToId} disabled={isPending} />
      <TransferItemScan fromLocationId={fromId} items={items}
        onAdd={(item) => setItems((prev) => [...prev, item])}
        onRemove={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
        disabled={isPending} />
      <TransferAccessoryRows rows={rows} categories={nonSerialized} onChange={setRows} disabled={isPending} />
      <div className="space-y-1">
        <Label htmlFor="transfer-note">{t('transfers.note')}</Label>
        <Input id="transfer-note" value={note} onChange={(e) => setNote(e.target.value)}
          maxLength={500} disabled={isPending} />
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={isPending}
          className="h-9 px-6 rounded-full bg-pricing-blue hover:bg-[#0077ed] text-gallery-white text-xs font-medium border-0">
          {isPending ? t('common.loading') : t('transfers.submit')}
        </Button>
      </div>
    </div>
  );
}
