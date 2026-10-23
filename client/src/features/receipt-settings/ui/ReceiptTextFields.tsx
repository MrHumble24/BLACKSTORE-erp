import { useTranslation } from 'react-i18next';
import { Input, Label } from '@/shared/ui';
import { RECEIPT_TEXT_FIELDS, type ReceiptSettings } from '@/entities/receipt-settings';

interface ReceiptTextFieldsProps {
  form: ReceiptSettings;
  setField: <K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => void;
}

/** Renders every receipt text field from one config list (label + placeholder per key). */
export function ReceiptTextFields({ form, setField }: ReceiptTextFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {RECEIPT_TEXT_FIELDS.map((key) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`receipt-${key}`}>{t(`receiptSettings.${key}`)}</Label>
          <Input
            id={`receipt-${key}`}
            value={form[key] as string}
            onChange={(e) => setField(key, e.target.value)}
            placeholder={t(`receiptSettings.${key}Placeholder`)}
          />
        </div>
      ))}
    </div>
  );
}
