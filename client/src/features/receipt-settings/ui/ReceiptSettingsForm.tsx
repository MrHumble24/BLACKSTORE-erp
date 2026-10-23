import { useTranslation } from 'react-i18next';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Button, FormError,
} from '@/shared/ui';
import { ReceiptDocument, useReceiptSettings } from '@/entities/receipt-settings';
import type { ReceiptSettings } from '@/entities/receipt-settings';
import { useReceiptSettingsForm } from '../model/useReceiptSettingsForm';
import { SAMPLE_SALE } from '../lib/sampleSale';
import { ReceiptTextFields } from './ReceiptTextFields';
import { ReceiptLogoField } from './ReceiptLogoField';
import { ReceiptToggleList } from './ReceiptToggleList';

/** Small section heading inside the editor card. */
function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-slate">{children}</h3>;
}

/** Two-pane editor (left) + live receipt preview (right) for one loaded settings object. */
function Editor({ initial }: { initial?: ReceiptSettings }) {
  const { t } = useTranslation();
  const { form, setField, pickLogo, handleSubmit, isPending, error } = useReceiptSettingsForm(initial);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-hairline-silver/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t('receiptSettings.title')}</CardTitle>
          <CardDescription>{t('receiptSettings.subtitle')}</CardDescription>
        </CardHeader>
        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
          <CardContent className="space-y-6">
            {error && <FormError message={error} />}
            <div className="space-y-4">
              <SectionTitle>{t('receiptSettings.sectionContent')}</SectionTitle>
              <ReceiptLogoField logo={form.logo} onPick={pickLogo} onRemove={() => setField('logo', '')} />
              <ReceiptTextFields form={form} setField={setField} />
            </div>
            <div className="space-y-4 border-t border-hairline-silver/60 pt-5">
              <SectionTitle>{t('receiptSettings.sectionVisibility')}</SectionTitle>
              <ReceiptToggleList form={form} setField={setField} />
            </div>
          </CardContent>
          <CardFooter className="justify-end pt-2">
            <Button type="submit" disabled={isPending}>{t('common.save')}</Button>
          </CardFooter>
        </form>
      </Card>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <SectionTitle>{t('receiptSettings.sectionPreview')}</SectionTitle>
        <div className="mt-3 rounded-2xl border border-hairline-silver/80 bg-white p-6 shadow-sm">
          <ReceiptDocument sale={SAMPLE_SALE} settings={form} />
        </div>
      </div>
    </div>
  );
}

/** Loads receipt settings, then mounts the editor fresh once data arrives. */
export function ReceiptSettingsForm() {
  const { t } = useTranslation();
  const { data, isLoading } = useReceiptSettings();

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate">{t('common.loading')}</div>;
  }
  return <Editor key={data ? 'loaded' : 'empty'} initial={data} />;
}
