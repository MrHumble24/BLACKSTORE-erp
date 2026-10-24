import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  IMEI_REGEX,
  useAddIdentifier,
  useScanErrorToast,
  type IdentifierType,
  type Item,
  type ItemIdentifier,
} from '@/entities/item';
import { useAddBatchItem, type AddBatchItemPayload } from '@/entities/batch';

/** Device waiting for its second code; `code` is the identifier that created it. */
export interface ScanTarget {
  itemId: number;
  code: string;
}

// Re-export moved from entities/item for backward compatibility.
export { useScanErrorToast };

interface UseScanTargetOptions {
  batchId: number;
  /** Runs after a successful scan or added code (clears and refocuses the input). */
  onSuccess: () => void;
}

type FailHandler = (error: unknown) => void;

/** Identifier type for an entered code: 15 digits → IMEI, anything else → SERIAL. */
export function codeIdentifierType(code: string): IdentifierType {
  return IMEI_REGEX.test(code) ? 'IMEI' : 'SERIAL';
}

/** Appends a freshly added identifier to the remembered item so the card updates at once. */
function withIdentifier(item: Item | null, itemId: number, identifier: ItemIdentifier): Item | null {
  if (!item || item.id !== itemId) return item;
  return { ...item, identifiers: [...item.identifiers, identifier] };
}

/** Creates one device line and reports the new item plus the scanned code. */
function useCreateLine(
  batchId: number,
  onCreated: (item: Item, code: string, dualSim: boolean) => void,
  onError: FailHandler,
) {
  const { mutate, isPending } = useAddBatchItem();
  const submit = (payload: AddBatchItemPayload, dualSim: boolean) => {
    mutate(
      { id: batchId, payload },
      {
        onSuccess: (item) =>
          onCreated(item, payload.identifiers[0]?.value ?? `#${item.id}`, dualSim),
        onError,
      },
    );
  };
  return { submit, isPending };
}

/** Adds one code (IMEI 2 or serial) to the waiting device. */
function useAddSecondCode(
  target: ScanTarget | null,
  onAdded: (identifier: ItemIdentifier, target: ScanTarget) => void,
  onError: FailHandler,
) {
  const { mutate, isPending } = useAddIdentifier();
  const submit = (rawCode: string) => {
    if (!target) return;
    const value = rawCode.trim().toUpperCase();
    mutate(
      { id: target.itemId, payload: { type: codeIdentifierType(value), value } },
      { onSuccess: (identifier) => onAdded(identifier, target), onError },
    );
  };
  return { submit, isPending };
}

/**
 * Owns the dual-SIM scan flow: remembers the last created phone, waits for its second
 * code and adds it through POST /items/:id/identifiers.
 */
export function useScanTarget({ batchId, onSuccess }: UseScanTargetOptions) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<ScanTarget | null>(null);
  const [lastItem, setLastItem] = useState<Item | null>(null);
  const fail = useScanErrorToast();

  const line = useCreateLine(batchId, (item, code, dualSim) => {
    setLastItem(item);
    setTarget(dualSim ? { itemId: item.id, code } : null);
    toast.success(t('batches.scanSuccess', { code }));
    onSuccess();
  }, fail);

  const second = useAddSecondCode(target, (identifier, pending) => {
    setLastItem((prev) => withIdentifier(prev, pending.itemId, identifier));
    setTarget(null);
    toast.success(t('batches.secondCodeAdded', { code: identifier.value }));
    onSuccess();
  }, fail);

  const waitForLastItem = () => {
    if (!lastItem) return;
    setTarget({ itemId: lastItem.id, code: lastItem.identifiers[0]?.value ?? `#${lastItem.id}` });
  };

  return {
    target,
    lastItem,
    submitNewLine: line.submit,
    submitIdentifier: second.submit,
    waitForLastItem,
    skipTarget: () => setTarget(null),
    isPending: line.isPending || second.isPending,
  };
}
