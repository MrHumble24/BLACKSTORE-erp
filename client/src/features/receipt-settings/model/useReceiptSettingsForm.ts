import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useSubmitWithError } from '@/shared/lib';
import {
  useUpdateReceiptSettings,
  DEFAULT_RECEIPT_SETTINGS,
  RECEIPT_TEXT_FIELDS,
  type ReceiptSettings,
} from '@/entities/receipt-settings';
import { fileToDataUrl } from '../lib/fileToDataUrl';

/** Holds the full receipt settings form (text, logo, toggles) and saves it. */
export function useReceiptSettingsForm(initial?: ReceiptSettings) {
  const { t } = useTranslation();
  const update = useUpdateReceiptSettings();
  const { error, runWithCatch } = useSubmitWithError();
  const [form, setForm] = useState<ReceiptSettings>({ ...DEFAULT_RECEIPT_SETTINGS, ...initial });

  function setField<K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** Converts the picked image to a base64 data URL, or toasts if it is too big. */
  async function pickLogo(file: File) {
    try {
      setField('logo', await fileToDataUrl(file));
    } catch {
      toast.error(t('receiptSettings.logoTooBig'));
    }
  }

  async function handleSubmit() {
    await runWithCatch(async () => {
      const payload: ReceiptSettings = { ...form };
      for (const f of RECEIPT_TEXT_FIELDS) payload[f] = form[f].trim();
      await update.mutateAsync(payload);
      toast.success(t('receiptSettings.savedSuccess'));
    });
  }

  return { form, setField, pickLogo, handleSubmit, isPending: update.isPending, error };
}
