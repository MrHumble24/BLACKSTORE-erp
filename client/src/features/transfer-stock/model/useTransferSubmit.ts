import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSubmitWithError } from '@/shared/lib';
import { useCreateTransfer, type CreateTransferPayload, type ItemBrief } from '@/entities/transfer';
import type { AccessoryDraft } from './accessory-draft';

interface TransferInput {
  fromId: number;
  toId: number;
  items: ItemBrief[];
  rows: AccessoryDraft[];
  note: string;
}

/** A started-but-not-finished accessory row (no model, or no valid quantity). */
function rowIncomplete(row: AccessoryDraft): boolean {
  const qty = Number(row.quantity);
  return row.productModelId === 0 || !Number.isInteger(qty) || qty <= 0;
}

/** Validates the transfer draft, creates it and navigates to the new transfer on success. */
export function useTransferSubmit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { error, setError, runWithCatch } = useSubmitWithError();
  const { mutateAsync, isPending } = useCreateTransfer();

  const submit = async ({ fromId, toId, items, rows, note }: TransferInput) => {
    if (!fromId || !toId) return setError(t('transfers.locationsRequired'));
    if (fromId === toId) return setError(t('transfers.locationsMustDiffer'));
    if (rows.some(rowIncomplete)) return setError(t('transfers.accessoryRowIncomplete'));
    const accessories = rows.map((r) => ({ productModelId: r.productModelId, quantity: Number(r.quantity) }));
    if (items.length === 0 && accessories.length === 0) return setError(t('transfers.atLeastOneLine'));

    const payload: CreateTransferPayload = {
      fromLocationId: fromId,
      toLocationId: toId,
      ...(items.length ? { itemIds: items.map((i) => i.id) } : {}),
      ...(accessories.length ? { accessories } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    const transfer = await runWithCatch(() => mutateAsync(payload));
    if (transfer) {
      toast.success(t('transfers.createdSuccess'));
      navigate(`/transfers/${transfer.id}`);
    }
  };

  return { submit, error, isPending };
}
