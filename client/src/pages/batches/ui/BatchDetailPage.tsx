import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Layers, Plus } from 'lucide-react';
import { BackLink, Button } from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import { useBatch, type Batch, type BatchLine } from '@/entities/batch';
import {
  BatchFormDialog,
  BatchScanPanel,
  AccessoryLineDialog,
  LinePriceDialog,
  PriceAllDialog,
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

/** "Price all of one model" button (manage_prices); batch needs at least one line. */
function PriceAllButton({ batch, onClick }: { batch: Batch; onClick: () => void }) {
  const { t } = useTranslation();
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  if (!canManagePrices || batch.lines.length === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-8 px-4 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal gap-1.5"
    >
      <Layers className="h-3 w-3 text-apple-blue" />
      <span>{t('batches.priceAll')}</span>
    </Button>
  );
}

/** Sticky notice shown instead of the edit controls when the batch is locked for this user. */
function LockedNotice() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-launch-orange/30 bg-launch-orange/5 px-4 py-3">
      <AlertCircle className="h-4 w-4 shrink-0 text-launch-orange" />
      <p className="text-xs text-ink">{t('batches.lockedNotice')}</p>
    </div>
  );
}

/** Header card + dialogs of one loaded batch; locked users get the read-only variant. */
function BatchDetailBody({ batch, locked }: { batch: Batch; locked: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [accessoryOpen, setAccessoryOpen] = useState(false);
  const [priceAllOpen, setPriceAllOpen] = useState(false);
  const [priceLine, setPriceLine] = useState<BatchLine | null>(null);

  return (
    <>
      <BatchHeaderCard
        batch={batch}
        onEdit={locked ? undefined : () => setEditOpen(true)}
        onOpenPriceAll={locked ? undefined : () => setPriceAllOpen(true)}
      />
      {locked && <LockedNotice />}
      {!locked && <BatchScanPanel batchId={batch.id} />}
      {!locked && (
        <div className="flex justify-end gap-2">
          <PriceAllButton batch={batch} onClick={() => setPriceAllOpen(true)} />
          <AddAccessoriesButton onClick={() => setAccessoryOpen(true)} />
        </div>
      )}
      <BatchLinesTable
        batchId={batch.id}
        lines={batch.lines}
        isLoading={false}
        locked={locked}
        onSetPrice={setPriceLine}
      />
      {!locked && (
        <BatchDialogs
          batchId={batch.id}
          editOpen={editOpen}
          accessoryOpen={accessoryOpen}
          priceAllOpen={priceAllOpen}
          priceLine={priceLine}
          batch={batch}
          onEditClose={() => setEditOpen(false)}
          onAccessoryClose={() => setAccessoryOpen(false)}
          onPriceAllClose={() => setPriceAllOpen(false)}
          onPriceLineClose={() => setPriceLine(null)}
        />
      )}
    </>
  );
}

/** The four edit dialogs, only rendered when the batch is editable by this user. */
function BatchDialogs({
  batchId,
  batch,
  editOpen,
  accessoryOpen,
  priceAllOpen,
  priceLine,
  onEditClose,
  onAccessoryClose,
  onPriceAllClose,
  onPriceLineClose,
}: {
  batchId: number;
  batch: Batch;
  editOpen: boolean;
  accessoryOpen: boolean;
  priceAllOpen: boolean;
  priceLine: BatchLine | null;
  onEditClose: () => void;
  onAccessoryClose: () => void;
  onPriceAllClose: () => void;
  onPriceLineClose: () => void;
}) {
  return (
    <>
      <BatchFormDialog open={editOpen} onOpenChange={(open) => (open ? undefined : onEditClose())} batch={batch} />
      <AccessoryLineDialog open={accessoryOpen} onOpenChange={(open) => (open ? undefined : onAccessoryClose())} batchId={batchId} />
      <PriceAllDialog open={priceAllOpen} onOpenChange={(open) => (open ? undefined : onPriceAllClose())} batch={batch} />
      <LinePriceDialog
        open={priceLine !== null}
        onOpenChange={(open) => (open ? undefined : onPriceLineClose())}
        batchId={batchId}
        line={priceLine}
      />
    </>
  );
}

/**
 * Batch detail page: header card, device scan panel (receive steps 2–3) and lines.
 * Cost columns and the price dialog appear only to those with the permission;
 * a batch older than 3 days is read-only without edit_past_records.
 */
export function BatchDetailPage() {
  const { t } = useTranslation();
  const canEditPastRecords = useAuthStore((state) => state.hasPermission('edit_past_records'));
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
      <BatchDetailBody batch={batch} locked={batch.isLocked && !canEditPastRecords} />
    </div>
  );
}
