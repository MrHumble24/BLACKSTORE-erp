import { useTranslation } from 'react-i18next';
import { Button, ScanCodeInput } from '@/shared/ui';
import type { RefObject } from 'react';
import type { useBulkScan } from '../model/useBulkScan';

interface BulkScanPanelProps {
  scan: ReturnType<typeof useBulkScan>;
  inputRef: RefObject<HTMLInputElement | null>;
}

/** Step strip and scan input for bulk add. */
export function BulkScanPanel({ scan, inputRef }: BulkScanPanelProps) {
  const { t } = useTranslation();
  const { steps, pending, stepIndex, currentStep, submitCode, cancelDevice, hasPending, value, setValue } = scan;

  const labelFor = (step: string) => {
    if (step === 'imei') return t('bulkAdd.scanLabel.imei');
    if (step === 'imei2') return t('bulkAdd.scanLabel.imei2');
    return t('bulkAdd.scanLabel.serial');
  };

  const getValue = (step: string) => {
    if (step === 'imei') return pending.imei;
    if (step === 'imei2') return pending.imei2;
    if (step === 'serial') return pending.serial;
    return undefined;
  };

  return (
    <section className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 space-y-4 shadow-none">
      <div className="text-base font-semibold text-ink">{t('batches.scanPanelTitle')}</div>
      {steps.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate">
          {steps.map((step, idx) => {
            const isDone = idx < stepIndex && getValue(step);
            const isCurrent = idx === stepIndex;
            return (
              <div key={step} className="flex items-center gap-2">
                <span className={isCurrent ? 'text-ink font-medium' : isDone ? 'text-slate' : 'text-slate/60'}>
                  {labelFor(step)}
                  {isDone && getValue(step) ? ` ✓ ${getValue(step)}` : ''}
                </span>
                {idx < steps.length - 1 && <span className="text-slate/40">→</span>}
              </div>
            );
          })}
        </div>
      )}
      <ScanCodeInput
        id="bulk-scan-input"
        label={currentStep ? labelFor(currentStep) : t('batches.scanInputLabel')}
        value={value}
        onChange={setValue}
        onSubmit={submitCode}
        inputRef={inputRef as React.MutableRefObject<HTMLInputElement | null>}
        placeholder={t('bulkAdd.scanPlaceholder')}
        hint={t('bulkAdd.scanHelp')}
      />
      {hasPending && (
        <Button variant="outline" size="sm" onClick={cancelDevice} className="rounded-full">
          {t('bulkAdd.cancelDevice')}
        </Button>
      )}
    </section>
  );
}
