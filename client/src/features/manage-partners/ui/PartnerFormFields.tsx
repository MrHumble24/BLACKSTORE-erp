import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui';

interface PartnerFormFieldsProps {
  name: string;
  phone: string;
  marketLocation: string;
  note: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onMarketLocationChange: (v: string) => void;
  onNoteChange: (v: string) => void;
}

/** Form fields for partner name, phone, market location and optional note. */
export function PartnerFormFields({
  name,
  phone,
  marketLocation,
  note,
  onNameChange,
  onPhoneChange,
  onMarketLocationChange,
  onNoteChange,
}: PartnerFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <TextField
        id="partner-name"
        label={t('partners.name')}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t('partners.name')}
        required
      />
      <TextField
        id="partner-phone"
        label={t('partners.phone')}
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder={t('common.phonePlaceholder')}
        required
      />
      <TextField
        id="partner-market"
        label={t('partners.marketLocation')}
        value={marketLocation}
        onChange={(e) => onMarketLocationChange(e.target.value)}
        placeholder={t('partners.marketLocationPlaceholder')}
      />
      <TextField
        id="partner-note"
        label={t('partners.note')}
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={t('partners.note')}
      />
    </>
  );
}
