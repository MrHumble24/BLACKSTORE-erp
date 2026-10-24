import { useTranslation } from 'react-i18next';
import { Switch } from '@/shared/ui';
import { useBulkAddStore } from '../model/bulkAdd.store';
import type { BulkScanState } from '../model/useBulkScan';

interface RowProps {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

/** One Switch row for a single code type (IMEI 1, IMEI 2 or serial). */
function CodeRow({ label, checked, disabled, onChange }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

/**
 * Codes-per-device card: which identifiers each device gets (IMEI 1, IMEI 2, serial).
 * Toggling a code cancels the device in progress so its step list is never half-changed.
 */
export function BulkAddCodesToggle({ scan }: { scan: BulkScanState }) {
  const { t } = useTranslation();
  const store = useBulkAddStore();

  const changeWithCancel = (partial: Partial<typeof store.codes>) => {
    store.setCodes(partial);
    scan.cancelDevice();
  };

  const { configErrors: errors } = scan;
  const codesError = errors['codes.imei'] ?? errors['codes.imei2'];

  return (
    <section className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 space-y-4 shadow-none">
      <div className="text-base font-semibold text-ink">{t('bulkAdd.codes')}</div>
      <div className="space-y-3">
        <CodeRow
          label={t('items.imei1')}
          checked={store.codes.imei}
          disabled={scan.isCreating}
          onChange={(checked) => changeWithCancel({ imei: checked })}
        />
        <CodeRow
          label={t('items.imei2')}
          checked={store.codes.imei2}
          disabled={scan.isCreating}
          onChange={(checked) => changeWithCancel({ imei2: checked })}
        />
        <CodeRow
          label={t('items.serial')}
          checked={store.codes.serial}
          disabled={scan.isCreating}
          onChange={(checked) => changeWithCancel({ serial: checked })}
        />
      </div>
      <p className="text-[11px] text-slate">{t('bulkAdd.codesHint')}</p>
      {codesError && <p className="text-xs text-launch-orange font-medium">{codesError}</p>}
    </section>
  );
}
