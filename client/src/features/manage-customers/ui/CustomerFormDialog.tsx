import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  FormError,
  DialogFormFooter,
} from '@/shared/ui';
import { useCreateOrUpdate } from '@/shared/lib';
import {
  useCreateCustomer,
  useUpdateCustomer,
  type Customer,
  type CustomerDetail,
  type CreateCustomerPayload,
  type UpdateCustomerPayload,
} from '@/entities/customer';

interface CustomerFormFieldsProps {
  name: string;
  phone: string;
  note: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onNoteChange: (v: string) => void;
}

function CustomerFormFields({
  name,
  phone,
  note,
  onNameChange,
  onPhoneChange,
  onNoteChange,
}: CustomerFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="customer-name">{t('customers.name')}</Label>
        <Input
          id="customer-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('customers.name')}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="customer-phone">{t('customers.phone')}</Label>
        <Input
          id="customer-phone"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder={t('common.phonePlaceholder')}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="customer-note">{t('customers.note')}</Label>
        <Input
          id="customer-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={t('customers.note')}
        />
      </div>
    </>
  );
}

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | CustomerDetail | null;
}

interface CustomerFormContentProps {
  customer?: Customer | CustomerDetail | null;
  onClose: () => void;
}

function CustomerFormContent({ customer, onClose }: CustomerFormContentProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [note, setNote] = useState(customer?.note ?? '');

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isEditing = Boolean(customer);

  const { submit, apiError, isPending } = useCreateOrUpdate<
    CreateCustomerPayload,
    { id: number; payload: UpdateCustomerPayload }
  >({
    create: (payload, opts) => createCustomer.mutate(payload, opts),
    update: (payload, opts) => updateCustomer.mutate(payload, opts),
    isPending: createCustomer.isPending || updateCustomer.isPending,
    isEditing,
    successMessage: isEditing ? t('customers.updatedSuccess') : t('customers.createdSuccess'),
    onDone: onClose,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const payload = { name: name.trim(), phone: phone.trim(), note: note.trim() || undefined };
    submit(payload, customer ? { id: customer.id, payload } : undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {apiError && <FormError message={apiError} />}
      <CustomerFormFields
        name={name}
        phone={phone}
        note={note}
        onNameChange={setName}
        onPhoneChange={setPhone}
        onNoteChange={setNote}
      />
      <DialogFormFooter onClose={onClose} isPending={isPending} saveText={t('common.save')} />
    </form>
  );
}

/** Dialog for creating or editing customer name, phone, and optional note. */
export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {customer ? t('customers.editCustomer') : t('customers.addCustomer')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <CustomerFormContent
            customer={customer}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
