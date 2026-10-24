import { useTranslation } from 'react-i18next';
import { Button, ScanCodeInput } from '@/shared/ui';
import type { RefObject } from 'react';
import type { BulkScanState } from '../model/useBulkScan';

interface BulkScanPanelProps {
  scan: BulkScanState;
  inputRef: RefObject<HTMLInputElement | null>;
}

/** Step strip and scan input for bulk add; the input is focused on page open (one-hand flow). */
export function BulkScanPanel({ scan, inputRef }: BulkScanPanelProps) {
  const { t } = useTranslation();
  const {
    steps, pending, stepIndex, currentStep, submitCode, cancelDevice, hasPending, isCreating, value, setValue,
  } = scan;

  return (
    <section className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 space-y-4 shadow-none">
      <div className="text-base font-semibold text-ink">{t('bulkAdd.scanPanelTitle')}</div>
      {steps.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate">
          {steps.map((step, idx) => {
            const done = idx < stepIndex ? pending[step] : undefined;
            const isCurrent = idx === stepIndex;
            return (
              <div key={step} className="flex items-center gap-2">
                <span className={isCurrent ? 'text-ink font-medium' : done ? 'text-slate' : 'text-slate/60'}>
                  {t(`bulkAdd.scanLabel.${step}`)}
                  {done ? ` ✓ ${done}` : ''}
                </span>
                {idx < steps.length - 1 && <span className="text-slate/40">→</span>}
              </div>
            );
          })}
        </div>
      )}
      <ScanCodeInput
        id="bulk-scan-input"
        label={currentStep ? t(`bulkAdd.scanLabel.${currentStep}`) : t('bulkAdd.scanInputLabel')}
        value={value}
        onChange={setValue}
        onSubmit={submitCode}
        inputRef={inputRef}
        autoFocus
        placeholder={t('bulkAdd.scanPlaceholder')}
        hint={t('bulkAdd.scanHelp')}
      />
      {hasPending && (
        <Button variant="outline" size="sm" onClick={cancelDevice} disabled={isCreating} className="rounded-full">
          {t('bulkAdd.cancelDevice')}
        </Button>
      )}
    </section>
  );
}
