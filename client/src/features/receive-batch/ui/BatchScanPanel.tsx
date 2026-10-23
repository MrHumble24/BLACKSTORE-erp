import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ScanLine } from 'lucide-react';
import { Button, ScanCodeInput } from '@/shared/ui';
import { normalizeMoney } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { useCategories, type Category } from '@/entities/category';
import { type BatchItemIdentifier } from '@/entities/batch';
import { formatAttributes, type Item, type ItemCondition } from '@/entities/item';
import { createBatchScanSchema, type BatchScanValues } from '../model/batch.schema';
import { useScanTarget, codeIdentifierType } from '../model/useScanTarget';
import { BatchScanSettingsFields } from './BatchScanSettingsFields';

/** Form setup for the one-time scan settings; attribute rules depend on the chosen category. */
function useBatchScanForm(
  serializedCategories: Category[],
  t: (k: string, options?: Record<string, unknown>) => string,
) {
  return useForm<BatchScanValues>({
    resolver: (values, ctx, opt) => {
      const category = serializedCategories.find((c) => c.id === values.categoryId);
      return zodResolver(createBatchScanSchema(t, category?.attributes ?? []))(values, ctx, opt);
    },
    defaultValues: {
      categoryId: 0,
      productModelId: 0,
      condition: 'NEW' satisfies ItemCondition,
      purchasePrice: '',
      attributes: {},
    },
  });
}

/** Form instance shape returned by useBatchScanForm. */
type ScanForm = ReturnType<typeof useBatchScanForm>;

/** Wraps an entered code as the item identifier sent when creating a device line. */
function toScanIdentifier(code: string): BatchItemIdentifier {
  return { type: codeIdentifierType(code), value: code };
}

/** Builds the POST /batches/:id/items payload from validated one-time settings. */
function buildLinePayload(
  values: BatchScanValues,
  code: string,
  category: Category | undefined,
  canManagePrices: boolean,
) {
  return {
    productModelId: values.productModelId,
    identifiers: [toScanIdentifier(code)],
    condition: values.condition,
    attributes: formatAttributes(values.attributes, category?.attributes),
    ...(canManagePrices && values.purchasePrice?.trim()
      ? { purchasePrice: normalizeMoney(values.purchasePrice) }
      : {}),
  };
}

/** Routes a code to the waiting phone or creates a new line; warns when a save is running. */
function useScanLineSubmit(
  canManagePrices: boolean,
  serializedCategories: Category[],
  form: ScanForm,
  scan: ReturnType<typeof useScanTarget>,
  dualSim: boolean,
) {
  const { t } = useTranslation();
  const { target, submitNewLine, submitIdentifier, isPending } = scan;

  const submitLine = (rawCode: string) => {
    if (isPending) {
      toast.warning(t('batches.scanBusy'));
      return;
    }
    const normalized = rawCode.trim().toUpperCase();
    if (!normalized) return;
    if (target) {
      submitIdentifier(normalized);
      return;
    }
    void form.trigger().then((settingsValid) => {
      if (!settingsValid) return;
      const values = form.getValues();
      const category = serializedCategories.find((c) => c.id === values.categoryId);
      submitNewLine(buildLinePayload(values, normalized, category, canManagePrices), dualSim);
    });
  };

  return { submitLine, isPending };
}

/** Section title row of the scan panel. */
function ScanPanelHeader() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-base font-semibold text-ink">
      <ScanLine className="h-4 w-4 text-pricing-blue" />
      {t('batches.scanPanelTitle')}
    </div>
  );
}

/** Row shown while the panel waits for the second code of the phone just created. */
function WaitingSecondCodeRow({
  code,
  model,
  onSkip,
}: {
  code: string;
  model: string | null;
  onSkip: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-pricing-blue/40 bg-pricing-blue/10 px-3 py-2.5">
      <div>
        {model && <p className="text-[11px] font-medium text-ink">{model}</p>}
        <p className="text-xs text-ink">{t('batches.waitingSecondCode', { code })}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onSkip} className="h-7 px-3 rounded-full text-xs">
        {t('batches.skip')}
      </Button>
    </div>
  );
}

/** Small card under the input: the last created phone, all its codes and a link to it. */
function LastPhoneCard({ item }: { item: Item }) {
  const { t } = useTranslation();
  const codes = item.identifiers.map((identifier) => identifier.value).join(' · ');

  return (
    <div className="space-y-1 rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink">{item.productModel.name}</p>
        <Link to={`/items/${item.id}`} className="text-[11px] text-apple-blue hover:underline">
          {t('batches.openItem')}
        </Link>
      </div>
      <p className="break-words text-[11px] text-slate">{codes}</p>
    </div>
  );
}

/** "Add code to last phone" button plus the card of that last phone. */
function LastPhoneSection({
  lastItem,
  waitForLastItem,
  isPending,
}: {
  lastItem: Item | null;
  waitForLastItem: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={waitForLastItem}
        disabled={!lastItem || isPending}
        className="h-8 px-4 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist text-xs font-normal"
      >
        {t('batches.addCodeToLast')}
      </Button>
      {lastItem && <LastPhoneCard item={lastItem} />}
    </>
  );
}

/**
 * Panel-local dual-SIM switch; switching it off abandons a waiting target so the
 * next scan starts a new phone instead of attaching to the previous one.
 */
function useDualSimState(clearPendingTarget: () => void) {
  const [dualSim, setDualSim] = useState(false);
  const onDualSimChange = (next: boolean) => {
    setDualSim(next);
    if (!next) clearPendingTarget();
  };
  return { dualSim, onDualSimChange };
}

/** Model name of the phone currently waiting for its second code, if known. */
function targetModelOf(scan: ReturnType<typeof useScanTarget>): string | null {
  return scan.target && scan.lastItem?.id === scan.target.itemId
    ? scan.lastItem.productModel.name
    : null;
}

/** One-time settings plus the always-focused scan input, waiting row and last phone card. */
export function BatchScanPanel({ batchId }: { batchId: number }) {
  const { t } = useTranslation();
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const { data: categories = [] } = useCategories();
  const serializedCategories = categories.filter((c) => c.isSerialized);
  const form = useBatchScanForm(serializedCategories, t);
  const [code, setCode] = useState('');
  // Scanning is a one-hand flow: the input must regain focus after every code.
  const inputRef = useRef<HTMLInputElement>(null);
  const scan = useScanTarget({
    batchId,
    onSuccess: () => {
      setCode('');
      inputRef.current?.focus();
    },
  });
  const { dualSim, onDualSimChange } = useDualSimState(scan.skipTarget);
  const { submitLine, isPending } = useScanLineSubmit(
    canManagePrices, serializedCategories, form, scan, dualSim,
  );
  return (
    <section className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 space-y-4 shadow-none">
      <ScanPanelHeader />
      <BatchScanSettingsFields
        form={form}
        categories={serializedCategories}
        canManagePrices={canManagePrices}
        disabled={isPending}
        dualSim={dualSim}
        onDualSimChange={onDualSimChange}
      />
      <ScanCodeInput
        id="batch-scan-input"
        label={t('batches.scanInputLabel')}
        value={code}
        onChange={setCode}
        onSubmit={submitLine}
        inputRef={inputRef}
        placeholder={t('batches.scanPlaceholder')}
        hint={t('batches.scanHelp')}
      />
      {scan.target && (
        <WaitingSecondCodeRow code={scan.target.code} model={targetModelOf(scan)} onSkip={scan.skipTarget} />
      )}
      <LastPhoneSection lastItem={scan.lastItem} waitForLastItem={scan.waitForLastItem} isPending={isPending} />
    </section>
  );
}
