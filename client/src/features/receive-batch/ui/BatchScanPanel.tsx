import { useState, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ScanLine } from 'lucide-react';
import { ScanCodeInput } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { normalizeMoney } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { useCategories, type Category } from '@/entities/category';
import { useAddBatchItem, type BatchItemIdentifier } from '@/entities/batch';
import { IMEI_REGEX, formatAttributes, type ItemCondition } from '@/entities/item';
import { createBatchScanSchema, type BatchScanValues } from '../model/batch.schema';
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

/** Decides the identifier type for a typed or scanned code: 15 digits → IMEI, else SERIAL. */
function toScanIdentifier(code: string): BatchItemIdentifier {
  return { type: IMEI_REGEX.test(code) ? 'IMEI' : 'SERIAL', value: code };
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

/** Validates one-time settings, adds the line, toasts the code and refocuses input. */
function useScanLineSubmit(
  batchId: number,
  canManagePrices: boolean,
  serializedCategories: Category[],
  form: ScanForm,
  onScanned: () => void,
  inputRef: RefObject<HTMLInputElement | null>,
) {
  const { t } = useTranslation();
  const { mutate: addLine, isPending } = useAddBatchItem();

  const submitLine = (rawCode: string) => {
    // A scanner doubles up on retries: drop codes that arrive while a request runs.
    if (isPending) return;
    const normalized = rawCode.trim().toUpperCase();
    if (!normalized) return;

    void form.trigger().then((settingsValid) => {
      if (!settingsValid) return;
      const values = form.getValues();
      const category = serializedCategories.find((c) => c.id === values.categoryId);
      addLine(
        { id: batchId, payload: buildLinePayload(values, normalized, category, canManagePrices) },
        {
          onSuccess: () => {
            toast.success(t('batches.scanSuccess', { code: normalized }));
            onScanned();
            inputRef.current?.focus();
          },
          onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
        },
      );
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

/** One-time settings (FR-14, W1 steps 2–3) plus the always-focused scan input. */
export function BatchScanPanel({ batchId }: { batchId: number }) {
  const { t } = useTranslation();
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const { data: categories = [] } = useCategories();
  const serializedCategories = categories.filter((c) => c.isSerialized);
  const form = useBatchScanForm(serializedCategories, t);
  const [code, setCode] = useState('');
  // Scanning is a one-hand flow: the input must regain focus after every code.
  const inputRef = useRef<HTMLInputElement>(null);
  const { submitLine, isPending } = useScanLineSubmit(
    batchId, canManagePrices, serializedCategories, form, () => setCode(''), inputRef,
  );

  return (
    <section className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 space-y-4 shadow-none">
      <ScanPanelHeader />
      <BatchScanSettingsFields
        form={form}
        categories={serializedCategories}
        canManagePrices={canManagePrices}
        disabled={isPending}
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
    </section>
  );
}
