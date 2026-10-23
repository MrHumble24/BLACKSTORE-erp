import { useTranslation } from 'react-i18next';
import { SelectField, TextField } from '@/shared/ui';
import { getTodayIso } from '@/shared/lib';
import { usePartners } from '@/entities/partner';

interface HandoverHeaderFieldsProps {
  partnerId: string;
  onPartnerChange: (id: string) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
  note: string;
  onNoteChange: (note: string) => void;
}

/** Top form fields for consignment handover: partner, due date, note. */
export function HandoverHeaderFields({
  partnerId,
  onPartnerChange,
  dueDate,
  onDueDateChange,
  note,
  onNoteChange,
}: HandoverHeaderFieldsProps) {
  const { t } = useTranslation();
  // ponytail: first 100 partners only; switch to a searchable select when a shop has more.
  const { data: partnersData } = usePartners('', 1, 100);

  const partnerOptions = (partnersData?.items ?? []).map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.phone})`,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SelectField
        label={t('consign.partner')}
        value={partnerId}
        onValueChange={onPartnerChange}
        options={partnerOptions}
        placeholder={t('consign.selectPartner')}
        required
      />
      <TextField
        id="consignment-due-date"
        label={t('consign.dueDate')}
        type="date"
        min={getTodayIso()}
        value={dueDate}
        onChange={(e) => onDueDateChange(e.target.value)}
        className="h-9 text-xs"
      />
      <TextField
        id="consignment-note"
        label={t('consign.note')}
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={t('consign.notePlaceholder')}
        className="h-9 text-xs"
      />
    </div>
  );
}
