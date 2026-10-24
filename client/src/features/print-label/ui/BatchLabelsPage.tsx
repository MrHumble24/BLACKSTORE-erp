import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { api } from '@/shared/api';
import { useBatch, type BatchLine } from '@/entities/batch';
import { getSystemCode } from '../model/label';
import { Code128Barcode } from './Code128Barcode';

interface GenerationState {
  isGenerating: boolean;
  totalMissing: number;
  completed: number;
}

/** Hook that checks batch device items and ensures all of them have persisted system codes. */
function useEnsureBatchCodes(batchLines: BatchLine[] | undefined, onRefetch: () => void) {
  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    totalMissing: 0,
    completed: 0,
  });
  const hasTriggeredRef = useRef(false);

  const missingItemIds = useMemo(() => {
    if (!batchLines) return [];
    return batchLines.flatMap((line) => {
      const item = line.item;
      if (!item || getSystemCode(item)) return [];
      return [item.id];
    });
  }, [batchLines]);

  useEffect(() => {
    if (hasTriggeredRef.current || missingItemIds.length === 0) return;
    hasTriggeredRef.current = true;

    setGenState({
      isGenerating: true,
      totalMissing: missingItemIds.length,
      completed: 0,
    });

    void (async () => {
      const requests = missingItemIds.map((id) =>
        api.post(`/items/${id}/system-code`).catch(() => undefined),
      );
      await Promise.allSettled(requests);
      setGenState({
        isGenerating: false,
        totalMissing: 0,
        completed: missingItemIds.length,
      });
      onRefetch();
    })();
  }, [missingItemIds, onRefetch]);

  return genState;
}

/** One 50×30 mm label card. */
function BatchLabelCard({ line }: { line: BatchLine }) {
  const code = getSystemCode(line.item);

  return (
    <div className="print-label thermal-label-card w-[50mm] h-[30mm] max-h-[30mm] overflow-hidden flex flex-col items-center justify-between py-2 px-2.5 bg-white text-black font-sans rounded-sm border border-hairline-silver/70 print:border-none print:rounded-none shadow-sm print:shadow-none">
      <p className="text-[10.5px] font-semibold leading-tight text-center line-clamp-2 w-full">
        {line.productModel.name}
      </p>
      {code ? (
        <div className="flex flex-col items-center gap-0.5">
          <Code128Barcode value={code} />
          <span className="text-[9.5px] font-mono font-medium tracking-tight">{code}</span>
        </div>
      ) : (
        <span className="text-[9px] text-slate font-mono">#{line.item?.id}</span>
      )}
    </div>
  );
}

/** Top header row with back button, batch summary and print action. */
function ToolbarHeader({
  batchId,
  supplierName,
  count,
  disabled,
}: {
  batchId: number;
  supplierName: string;
  count: number;
  disabled: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline-silver/60 pb-4">
      <div className="flex items-center gap-3">
        <Link
          to={`/batches/${batchId}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist"
          title={t('batches.backToList')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">
            {t('labels.batchLabelsTitle')}
          </h1>
          <p className="text-xs text-slate">
            {supplierName} · {t('labels.batchLabelsCount', { count })} (50×30 mm)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => window.print()}
          disabled={disabled}
          className="gap-2 bg-pricing-blue hover:bg-pricing-blue/90 text-white rounded-full text-xs font-medium px-5 h-8 shadow-none"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>{t('labels.printAll')}</span>
        </Button>
      </div>
    </div>
  );
}

/** Status notices for code generation and printer roll guidance. */
function ToolbarStatus({
  isGenerating,
  completed,
  totalMissing,
  count,
}: {
  isGenerating: boolean;
  completed: number;
  totalMissing: number;
  count: number;
}) {
  const { t } = useTranslation();

  if (isGenerating) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-studio-mist px-4 py-2.5 text-xs text-ink">
        <Loader2 className="h-4 w-4 animate-spin text-apple-blue shrink-0" />
        <span>
          {t('labels.generatingBatchCodes', { current: completed, total: totalMissing })}
        </span>
      </div>
    );
  }

  if (count > 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#30d158]" />
        <span>{t('labels.batchPrintHint')}</span>
      </div>
    );
  }

  return null;
}

/** Screen-only toolbar with batch metadata, count and Print action. */
function BatchLabelsToolbar({
  batchId,
  supplierName,
  count,
  isGenerating,
  completed,
  totalMissing,
}: {
  batchId: number;
  supplierName: string;
  count: number;
  isGenerating: boolean;
  completed: number;
  totalMissing: number;
}) {
  return (
    <div className="print:hidden mb-6 space-y-4">
      <ToolbarHeader
        batchId={batchId}
        supplierName={supplierName}
        count={count}
        disabled={isGenerating || count === 0}
      />
      <ToolbarStatus
        isGenerating={isGenerating}
        completed={completed}
        totalMissing={totalMissing}
        count={count}
      />
    </div>
  );
}

/**
 * 50×30 mm batch thermal labels page (FR-15):
 * Renders Code128 labels for all device lines in a batch sequentially for thermal rolls.
 */
export function BatchLabelsPage() {
  const { id } = useParams<{ id: string }>();
  const batchId = Number(id);
  const { data: batch, isLoading, refetch } = useBatch(batchId);
  const { t } = useTranslation();

  const deviceLines = useMemo(() => {
    if (!batch) return [];
    return batch.lines.filter((line) => line.item !== null);
  }, [batch]);

  const genState = useEnsureBatchCodes(batch?.lines, () => {
    void refetch();
  });

  if (isLoading) {
    return <div className="p-6 text-xs text-slate">{t('common.loading')}</div>;
  }

  if (!batch) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/batches" className="text-xs text-apple-blue hover:underline">
          {t('batches.backToList')}
        </Link>
        <div className="text-xs text-slate">{t('batches.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BatchLabelsToolbar
        batchId={batch.id}
        supplierName={batch.supplier.name}
        count={deviceLines.length}
        isGenerating={genState.isGenerating}
        completed={genState.completed}
        totalMissing={genState.totalMissing}
      />

      {deviceLines.length === 0 ? (
        <div className="text-xs text-slate py-8 text-center bg-studio-mist/40 rounded-2xl">
          {t('labels.noDevicesInBatch')}
        </div>
      ) : (
        <div className="thermal-label-container grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
          {deviceLines.map((line) => (
            <BatchLabelCard key={line.id} line={line} />
          ))}
        </div>
      )}
    </div>
  );
}
