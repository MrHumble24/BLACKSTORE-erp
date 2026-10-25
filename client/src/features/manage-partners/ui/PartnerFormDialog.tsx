import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FormError,
  DialogFormFooter,
} from '@/shared/ui';
import { useCreateOrUpdate } from '@/shared/lib';
import {
  useCreatePartner,
  useUpdatePartner,
  type Partner,
  type CreatePartnerPayload,
  type UpdatePartnerPayload,
} from '@/entities/partner';
import { PartnerFormFields } from './PartnerFormFields';

interface PartnerFormContentProps {
  partner?: Partner | null;
  onClose: () => void;
}

function usePartnerForm(partner: Partner | null | undefined, onClose: () => void) {
  const { t } = useTranslation();
  const [name, setName] = useState(partner?.name ?? '');
  const [phone, setPhone] = useState(partner?.phone ?? '');
  const [marketLocation, setMarketLocation] = useState(partner?.marketLocation ?? '');
  const [note, setNote] = useState(partner?.note ?? '');

  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const isEditing = Boolean(partner);

  const { submit, apiError, isPending } = useCreateOrUpdate<
    CreatePartnerPayload,
    { id: number; payload: UpdatePartnerPayload }
  >({
    create: (payload, opts) => createPartner.mutate(payload, opts),
    update: (payload, opts) => updatePartner.mutate(payload, opts),
    isPending: createPartner.isPending || updatePartner.isPending,
    isEditing,
    successMessage: isEditing ? t('partners.updatedSuccess') : t('partners.createdSuccess'),
    onDone: onClose,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const trimmedPhone = phone.trim();
    const payload = {
      name: name.trim(),
      phone: trimmedPhone || undefined,
      marketLocation: marketLocation.trim() || undefined,
      note: note.trim() || undefined,
    };
    // Phone is optional: omitted on create when blank, sent as null on edit to clear it.
    const update = partner
      ? { id: partner.id, payload: { ...payload, phone: trimmedPhone || null } }
      : undefined;
    submit(payload, update);
  };

  return {
    name, setName, phone, setPhone, marketLocation, setMarketLocation,
    note, setNote, apiError, isPending, handleSubmit,
  };
}

function PartnerFormContent({ partner, onClose }: PartnerFormContentProps) {
  const form = usePartnerForm(partner, onClose);

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4 pt-2">
      {form.apiError && <FormError message={form.apiError} />}
      <PartnerFormFields
        name={form.name}
        phone={form.phone}
        marketLocation={form.marketLocation}
        note={form.note}
        onNameChange={form.setName}
        onPhoneChange={form.setPhone}
        onMarketLocationChange={form.setMarketLocation}
        onNoteChange={form.setNote}
      />
      <DialogFormFooter onClose={onClose} isPending={form.isPending} />
    </form>
  );
}

interface PartnerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
}

/** Dialog for creating or editing partner name, phone, market location and note. */
export function PartnerFormDialog({
  open,
  onOpenChange,
  partner,
}: PartnerFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {partner ? t('partners.editPartner') : t('partners.addPartner')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <PartnerFormContent
            partner={partner}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
