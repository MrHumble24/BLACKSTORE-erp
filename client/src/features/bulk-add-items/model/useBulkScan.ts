import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  IMEI_REGEX,
  SCAN_CODE_REGEX,
  buildIdentifiers,
  formatAttributes,
  useCreateItem,
  useScanErrorToast,
  type CreateItemPayload,
  type Item,
} from '@/entities/item';
import { normalizeMoney } from '@/shared/lib';
import { getApiErrorStatus } from '@/shared/api';
import { useAuthStore } from '@/entities/session';
import { createBulkAddSchema } from './bulkAdd.schema';
import type { BulkAddConfig } from './bulkAdd.store';
import type { CategoryAttribute } from '@/entities/category';

export type CodeStep = 'imei' | 'imei2' | 'serial';
export type PendingCodes = Partial<Record<CodeStep, string>>;

export interface BulkScanOptions {
  config: BulkAddConfig;
  /** Attribute definitions of the selected category (required-checks and attribute formatting). */
  attributesList: CategoryAttribute[];
  /** Regains focus for the scan input, called after every consumed code or reset. */
  onRefocus: () => void;
}

type TFn = (k: string, options?: Record<string, unknown>) => string;
type SetErrors = (errors: Record<string, string>) => void;
type PriceKey = 'purchasePrice' | 'salePrice' | 'minSalePrice';

/** Per-scan rule check: returns the translation key of the first failing rule, or null. */
function stepValidationError(step: CodeStep, code: string, imei1: string | undefined): string | null {
  if (step === 'serial') {
    return SCAN_CODE_REGEX.test(code) ? null : 'items.validation.invalidSerial';
  }
  if (!IMEI_REGEX.test(code)) return 'items.validation.invalidImei';
  return step === 'imei2' && imei1 === code ? 'bulkAdd.validation.sameImei' : null;
}

/**
 * Runs the settings schema; inline errors are only produced before the first code of a device
 * (mid-device changes are kept), returning whether the settings are usable for a scan.
 */
function validateDeviceConfig(
  hasPending: boolean,
  config: BulkAddConfig,
  attributesList: CategoryAttribute[],
  t: TFn,
  setErrors: SetErrors,
): boolean {
  if (hasPending) return true;
  const errors: Record<string, string> = {};
  const result = createBulkAddSchema(t, attributesList).safeParse(config);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) errors[path] = issue.message;
    }
  }
  setErrors(errors); // non-empty errors stay inline; the code is not consumed
  return Object.keys(errors).length === 0;
}

/** One optional price field for the payload: only when the user may send it and it is filled. */
function price(key: PriceKey, value: string, allowed: boolean): Partial<Pick<CreateItemPayload, PriceKey>> {
  return allowed && value.trim() ? { [key]: normalizeMoney(value) } : {};
}

/** Builds the POST /items payload: config fields + device codes + permission-gated prices. */
function buildItemPayload(
  codes: PendingCodes,
  config: BulkAddConfig,
  attributesList: CategoryAttribute[],
  canManagePrices: boolean,
  canViewCost: boolean,
): CreateItemPayload {
  return {
    productModelId: config.productModelId,
    investorId: config.investorId,
    locationId: config.locationId,
    condition: config.condition,
    attributes: formatAttributes(config.attributes, attributesList),
    identifiers: buildIdentifiers({
      imei: codes.imei ?? '',
      imei2: codes.imei2 ?? '',
      serial: codes.serial ?? '',
    }),
    // Cost never leaves the client without manage_prices + view_cost (staff-never-sees-cost).
    ...price('purchasePrice', config.purchasePrice, canManagePrices && canViewCost),
    ...price('salePrice', config.salePrice, canManagePrices),
    ...price('minSalePrice', config.minSalePrice, canManagePrices),
  };
}

/** Inline settings-validation errors keyed by field path; cleared per field or wholesale. */
function useConfigErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  const clearAll = () => setErrors({});
  return { errors, setErrors, clearError, clearAll };
}

/** The device in progress: its scanned codes, the current step index and the scan input text. */
function useDeviceDraft(onRefocus: () => void) {
  const [pending, setPending] = useState<PendingCodes>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [value, setValue] = useState('');

  const clearInput = () => {
    setValue('');
    onRefocus();
  };
  /** Stores one code and moves to the next step. */
  const advance = (step: CodeStep, code: string) => {
    setPending((prev) => ({ ...prev, [step]: code }));
    setStepIndex((index) => index + 1);
    clearInput();
  };
  /** Drops the device in progress (codes + step) and the input text; the input keeps focus. */
  const clear = () => {
    setPending({});
    setStepIndex(0);
    clearInput();
  };
  return { pending, stepIndex, value, setValue, advance, clearInput, clear };
}

/** Creates each finished device with one POST /items and collects the session list. */
function useDeviceCreate(
  buildPayload: (codes: PendingCodes) => CreateItemPayload,
  onDeviceDone: () => void,
  onFailed: () => void,
) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useCreateItem();
  const failToast = useScanErrorToast();
  const [added, setAdded] = useState<Item[]>([]);
  // Set synchronously: `isPending` only flips after a re-render, so two fast Enter presses
  // would otherwise send the same device twice.
  const busyRef = useRef(false);

  const createDevice = async (codes: PendingCodes) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const item = await mutateAsync(buildPayload(codes));
      toast.success(t('bulkAdd.added', { code: item.identifiers[0]?.value ?? `#${item.id}` }));
      setAdded((prev) => [item, ...prev]);
      onDeviceDone();
    } catch (err: unknown) {
      failToast(err);
      // 409 duplicate: start the next device. Any other error: nothing was committed, so the
      // codes are kept, but the input is cleared so the next scan does not append to the old code.
      if (getApiErrorStatus(err) === 409) onDeviceDone();
      else onFailed();
    } finally {
      busyRef.current = false;
    }
  };

  return { added, isCreating: isPending, isBusy: () => busyRef.current, createDevice };
}

/**
 * Bulk-add scan flow: settings are validated once per device, scanned codes fill the enabled
 * steps in fixed order (imei → imei2 → serial), and the last code creates the item with one POST /items.
 */
export function useBulkScan({ config, attributesList, onRefocus }: BulkScanOptions) {
  const { t } = useTranslation();
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const configErrors = useConfigErrors();
  const draft = useDeviceDraft(onRefocus);
  const create = useDeviceCreate(
    (codes) => buildItemPayload(codes, config, attributesList, canManagePrices, canViewCost),
    draft.clear,
    draft.clearInput,
  );

  const steps = (['imei', 'imei2', 'serial'] as const).filter((step) => config.codes[step]);
  const currentStep = steps[draft.stepIndex] ?? null;
  const hasPending = Object.keys(draft.pending).length > 0;

  /** Routes one scanned code: validate → store → advance; the last code creates the device. */
  const submitCode = (raw: string) => {
    if (create.isBusy()) {
      toast.warning(t('bulkAdd.busy'));
      return;
    }
    if (!currentStep) return;
    if (!validateDeviceConfig(hasPending, config, attributesList, t, configErrors.setErrors)) return;
    const code = raw.trim().toUpperCase();
    if (!code) return;
    const errorKey = stepValidationError(currentStep, code, draft.pending.imei);
    if (errorKey) {
      toast.error(t(errorKey));
      draft.clearInput(); // per-scan failure: the step is kept, only the input is cleared
      return;
    }
    if (draft.stepIndex + 1 >= steps.length) {
      void create.createDevice({ ...draft.pending, [currentStep]: code });
      return;
    }
    draft.advance(currentStep, code);
  };

  return {
    steps, currentStep, hasPending, submitCode,
    pending: draft.pending, stepIndex: draft.stepIndex, value: draft.value, setValue: draft.setValue,
    cancelDevice: draft.clear,
    added: create.added, isCreating: create.isCreating,
    configErrors: configErrors.errors,
    clearConfigError: configErrors.clearError, clearAllConfigErrors: configErrors.clearAll,
  };
}

export type BulkScanState = ReturnType<typeof useBulkScan>;
