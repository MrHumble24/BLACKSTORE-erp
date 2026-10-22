import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { BackLink, Button } from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import { useBatch, type Batch, type BatchLine } from '@/entities/batch';
import {
  BatchFormDialog,
  BatchScanPanel,
  AccessoryLineDialog,
  LinePriceDialog,
} from '@/features/receive-batch';
import { BatchHeaderCard } from './BatchHeaderCard';
import { BatchLinesTable } from './BatchLinesTable';

/** "Add accessories" button opening its dialog; receive_batch only (POST needs it). */
function AddAccessoriesButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const canReceiveBatch = useAuthStore((state) => state.hasPermission('receive_batch'));
  if (!canReceiveBatch) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-8 px-4 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal gap-1.5"
    >
      <Plus className="h-3 w-3 text-apple-blue" />
      <span>{t('batches.addAccessories')}</span>
    </Button>
  );
}

/** Header card, scan panel, lines table and the three dialogs of one loaded batch. */
function BatchDetailBody({ batch }: { batch: Batch }) {
  const [editOpen, setEditOpen] = useState(false);
  const [accessoryOpen, setAccessoryOpen] = useState(false);
  const [priceLine, setPriceLine] = useState<BatchLine | null>(null);

  return (
    <>
      <BatchHeaderCard batch={batch} onEdit={() => setEditOpen(true)} />
      <BatchScanPanel batchId={batch.id} />
      <div className="flex justify-end">
        <AddAccessoriesButton onClick={() => setAccessoryOpen(true)} />
      </div>
      <BatchLinesTable
        lines={batch.lines}
        isLoading={false}
        onSetPrice={setPriceLine}
      />
      <BatchFormDialog open={editOpen} onOpenChange={setEditOpen} batch={batch} />
      <AccessoryLineDialog
        open={accessoryOpen}
        onOpenChange={setAccessoryOpen}
        batchId={batch.id}
      />
      <LinePriceDialog
        open={priceLine !== null}
        onOpenChange={(open) => {
          if (!open) setPriceLine(null);
        }}
        batchId={batch.id}
        line={priceLine}
      />
    </>
  );
}

/**
 * Batch detail page: header card, device scan panel (receive steps 2–3) and lines.
 * Cost columns and the price dialog appear only to those with the permission.
 */
export function BatchDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const batchId = Number(id);
  const { data: batch, isLoading } = useBatch(Number.isNaN(batchId) ? 0 : batchId);

  if (isLoading) {
    return <div className="text-xs text-slate">{t('common.loading')}</div>;
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <BackLink to="/batches" label={t('batches.backToList')} />
        <div className="text-xs text-slate">{t('batches.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BatchDetailBody batch={batch} />
    </div>
  );
}
