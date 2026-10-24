import { useState, useRef, type Dispatch, type SetStateAction } from 'react';
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
import type { BulkAddCodes, BulkAddConfig } from './bulkAdd.store';
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

/** Enabled code steps in the fixed scan order imei → imei2 → serial. */
function computeSteps(codes: BulkAddCodes): CodeStep[] {
  const steps: CodeStep[] = [];
  if (codes.imei) steps.push('imei');
  if (codes.imei2) steps.push('imei2');
  if (codes.serial) steps.push('serial');
  return steps;
}

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

/** Builds the POST /items payload: config fields + device codes + permission-gated prices. */
function buildItemPayload(
  codes: PendingCodes,
  config: BulkAddConfig,
  attributesList: CategoryAttribute[],
  canManagePrices: boolean,
  canViewCost: boolean,
): CreateItemPayload {
  const identifiers = buildIdentifiers({
    imei: codes.imei ?? '',
    imei2: codes.imei2 ?? '',
    serial: codes.serial ?? '',
  });
  return {
    productModelId: config.productModelId,
    investorId: config.investorId,
    locationId: config.locationId,
    condition: config.condition,
    attributes: formatAttributes(config.attributes, attributesList),
    identifiers,
    // Cost never leaves the client without manage_prices + view_cost (staff-never-sees-cost).
    ...(canManagePrices && canViewCost && config.purchasePrice.trim()
      ? { purchasePrice: normalizeMoney(config.purchasePrice) }
      : {}),
    ...(canManagePrices && config.salePrice.trim()
      ? { salePrice: normalizeMoney(config.salePrice) }
      : {}),
    ...(canManagePrices && config.minSalePrice.trim()
      ? { minSalePrice: normalizeMoney(config.minSalePrice) }
      : {}),
  };
}

/** Drops the device in progress (codes + step) and the scan input; the input keeps focus. */
function resetDevice(
  setPending: Dispatch<SetStateAction<PendingCodes>>,
  setStepIndex: Dispatch<SetStateAction<number>>,
  setValue: (value: string) => void,
  onRefocus: () => void,
) {
  setPending({});
  setStepIndex(0);
  setValue('');
  onRefocus();
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

/** Creates each finished device with one POST /items and collects the session list. */
function useDeviceCreate(
  config: BulkAddConfig,
  attributesList: CategoryAttribute[],
  canManagePrices: boolean,
  canViewCost: boolean,
  onDeviceReset: () => void,
  onRefocus: () => void,
) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useCreateItem();
  const failToast = useScanErrorToast();
  const [added, setAdded] = useState<Item[]>([]);
  const isCreatingRef = useRef(false);

  const createDevice = async (codes: PendingCodes) => {
    isCreatingRef.current = true;
    try {
      const payload = buildItemPayload(codes, config, attributesList, canManagePrices, canViewCost);
      const item = await mutateAsync(payload);
      const code = item.identifiers[0]?.value ?? `#${item.id}`;
      toast.success(t('bulkAdd.added', { code }));
      setAdded((prev) => [item, ...prev]);
      onDeviceReset();
    } catch (err: unknown) {
      failToast(err);
      if (getApiErrorStatus(err) === 409) onDeviceReset(); // duplicate: start the next device
      else onRefocus(); // nothing was committed; the user may rescan the same codes
    } finally {
      isCreatingRef.current = false;
    }
  };

  return {
    added,
    isCreating: isPending,
    createDevice,
  };
}

/**
 * Bulk-add scan flow: settings are validated once per device, scanned codes fill the enabled
 * steps in fixed order, and the last code creates the item with one POST /items.
 */
export function useBulkScan({ config, attributesList, onRefocus }: BulkScanOptions) {
  const { t } = useTranslation();
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const configErrors = useConfigErrors();
  const [pending, setPending] = useState<PendingCodes>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [value, setValue] = useState('');

  const steps = computeSteps(config.codes);
  const currentStep = steps[stepIndex] ?? null;
  const hasPending = Object.keys(pending).length > 0;
  const clearDevice = () => resetDevice(setPending, setStepIndex, setValue, onRefocus);
  const create = useDeviceCreate(
    config, attributesList, canManagePrices, canViewCost, clearDevice, onRefocus,
  );

  const tryValidateConfig = () =>
    validateDeviceConfig(hasPending, config, attributesList, t, configErrors.setErrors);

  /** Routes one scanned code: validate → store → advance; the last code creates the device. */
  const submitCode = (raw: string) => {
    if (create.isCreating) {
      toast.warning(t('bulkAdd.busy'));
      return;
    }
    if (!currentStep || !tryValidateConfig()) return;
    const code = raw.trim().toUpperCase();
    if (!code) return;
    const errorKey = stepValidationError(currentStep, code, pending.imei);
    if (errorKey) {
      toast.error(t(errorKey));
      setValue(''); // per-scan failure: the step is kept, only the input is cleared
      onRefocus();
      return;
    }
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      void create.createDevice({ ...pending, [currentStep]: code });
      return;
    }
    setPending({ ...pending, [currentStep]: code });
    setStepIndex(nextIndex);
    setValue('');
    onRefocus();
  };

  return {
    steps, pending, stepIndex, currentStep,
    added: create.added, hasPending, isCreating: create.isCreating,
    submitCode, cancelDevice: clearDevice,
    value, setValue,
    configErrors: configErrors.errors,
    clearConfigError: configErrors.clearError, clearAllConfigErrors: configErrors.clearAll,
  };
}

export type BulkScanState = ReturnType<typeof useBulkScan>;
