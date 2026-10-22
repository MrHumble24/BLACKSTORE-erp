import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Label,
  Button,
  FormError,
} from '@/shared/ui';
import { useSubmitWithError } from '@/shared/lib';
import {
  useReceiptSettings,
  useUpdateReceiptSettings,
  type ReceiptSettings,
} from '@/entities/receipt-settings';

interface ReceiptInputInputsProps {
  shopName: string;
  address: string;
  phone: string;
  footer: string;
  onShopNameChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onFooterChange: (v: string) => void;
}

function ReceiptInputInputs(props: ReceiptInputInputsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="receipt-shop-name">{t('receiptSettings.shopName')}</Label>
        <Input
          id="receipt-shop-name"
          value={props.shopName}
          onChange={(e) => props.onShopNameChange(e.target.value)}
          placeholder={t('receiptSettings.shopNamePlaceholder')}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="receipt-address">{t('receiptSettings.address')}</Label>
        <Input
          id="receipt-address"
          value={props.address}
          onChange={(e) => props.onAddressChange(e.target.value)}
          placeholder={t('receiptSettings.addressPlaceholder')}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="receipt-phone">{t('receiptSettings.phone')}</Label>
        <Input
          id="receipt-phone"
          value={props.phone}
          onChange={(e) => props.onPhoneChange(e.target.value)}
          placeholder={t('receiptSettings.phonePlaceholder')}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="receipt-footer">{t('receiptSettings.footer')}</Label>
        <Input
          id="receipt-footer"
          value={props.footer}
          onChange={(e) => props.onFooterChange(e.target.value)}
          placeholder={t('receiptSettings.footerPlaceholder')}
        />
      </div>
    </>
  );
}

function useReceiptSettingsFormState(initialSettings?: ReceiptSettings) {
  const { t } = useTranslation();
  const updateSettings = useUpdateReceiptSettings();
  const { error, runWithCatch } = useSubmitWithError();

  const [shopName, setShopName] = useState(initialSettings?.shopName ?? '');
  const [address, setAddress] = useState(initialSettings?.address ?? '');
  const [phone, setPhone] = useState(initialSettings?.phone ?? '');
  const [footer, setFooter] = useState(initialSettings?.footer ?? '');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await runWithCatch(async () => {
      await updateSettings.mutateAsync({
        shopName: shopName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        footer: footer.trim(),
      });
      toast.success(t('receiptSettings.savedSuccess'));
    });
  };

  return {
    shopName,
    setShopName,
    address,
    setAddress,
    phone,
    setPhone,
    footer,
    setFooter,
    isPending: updateSettings.isPending,
    error,
    handleSubmit,
  };
}

interface ReceiptSettingsFieldsProps {
  initialSettings?: ReceiptSettings;
}

function ReceiptSettingsFields({ initialSettings }: ReceiptSettingsFieldsProps) {
  const { t } = useTranslation();
  const form = useReceiptSettingsFormState(initialSettings);

  return (
    <Card className="max-w-2xl border-hairline-silver/70 shadow-sm">
      <CardHeader>
        <CardTitle>{t('receiptSettings.title')}</CardTitle>
        <CardDescription>{t('receiptSettings.subtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit}>
        <CardContent className="space-y-4">
          {form.error && <FormError message={form.error} />}
          <ReceiptInputInputs
            shopName={form.shopName}
            address={form.address}
            phone={form.phone}
            footer={form.footer}
            onShopNameChange={form.setShopName}
            onAddressChange={form.setAddress}
            onPhoneChange={form.setPhone}
            onFooterChange={form.setFooter}
          />
        </CardContent>
        <CardFooter className="flex justify-end pt-2">
          <Button type="submit" disabled={form.isPending}>
            {t('common.save')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/** Form for configuring shop header and footer on printed receipts. */
export function ReceiptSettingsForm() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useReceiptSettings();

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate">{t('common.loading')}</div>;
  }

  return (
    <ReceiptSettingsFields
      key={settings ? `${settings.shopName}-${settings.phone}` : 'empty'}
      initialSettings={settings}
    />
  );
}
