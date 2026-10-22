import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getApiErrorStatus } from '@/shared/api';
import { useItemByCode, SCAN_CODE_REGEX, type Item } from '@/entities/item';
import type { ItemBrief } from '@/entities/transfer';

/** Reduces a scanned item to the brief the transfer list shows and sends. */
export function toBrief(item: Item): ItemBrief {
  return {
    id: item.id,
    identifiers: item.identifiers,
    productModel: { id: item.productModel.id, name: item.productModel.name },
    status: item.status,
    location: { id: item.location.id, name: item.location.name },
  };
}

interface Options {
  fromLocationId: number;
  items: ItemBrief[];
  onAdd: (item: ItemBrief) => void;
  /** Clears the input and refocuses it after each scan. */
  reset: () => void;
}

/** Looks a scanned code up and adds it if it is IN_STOCK at the source and not already listed. */
export function useScanToAdd({ fromLocationId, items, onAdd, reset }: Options) {
  const { t } = useTranslation();
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
        reset();
        if (item.status !== 'IN_STOCK' || item.location.id !== fromLocationId) {
          toast.error(t('transfers.itemNotAtSource'));
        } else if (items.some((i) => i.id === item.id)) {
          toast.error(t('transfers.itemAlreadyAdded'));
        } else {
          onAdd(toBrief(item));
        }
      },
      onError: (err) => {
        reset();
        toast.error(getApiErrorStatus(err) === 404 ? t('scan.notFound') : t('common.error'));
      },
    });
  };

  return { handleScan };
}
