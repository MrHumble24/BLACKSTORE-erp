import { useTranslation } from 'react-i18next';
import { Switch } from '@/shared/ui';
import type { ReceiptSettings } from '@/entities/receipt-settings';

/** Each toggle field paired with its short label key under receiptSettings.toggles. */
const TOGGLES = [
  ['showLogo', 'logo'],
  ['showHeaderNote', 'headerNote'],
  ['showTaxId', 'taxId'],
  ['showAddress', 'address'],
  ['showPhone', 'phone'],
  ['showSecondContact', 'secondContact'],
  ['showWebsite', 'website'],
  ['showCustomer', 'customer'],
  ['showWarranty', 'warranty'],
  ['showFooter', 'footer'],
] as const satisfies readonly [keyof ReceiptSettings, string][];

interface ReceiptToggleListProps {
  form: ReceiptSettings;
  setField: <K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => void;
}

/** On/off switches that control which parts print on the receipt. */
export function ReceiptToggleList({ form, setField }: ReceiptToggleListProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {TOGGLES.map(([key, label]) => (
        <label
          key={key}
          htmlFor={`toggle-${key}`}
          className="flex cursor-pointer items-center justify-between gap-3"
        >
          <span className="text-sm text-ink">{t(`receiptSettings.toggles.${label}`)}</span>
          <Switch
            id={`toggle-${key}`}
            checked={form[key] as boolean}
            onCheckedChange={(v) => setField(key, v)}
          />
        </label>
      ))}
    </div>
  );
}
