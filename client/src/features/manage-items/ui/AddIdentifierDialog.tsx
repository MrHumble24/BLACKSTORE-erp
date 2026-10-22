import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFormFooter,
  FormError,
  Input,
  Label,
  SelectField,
} from '@/shared/ui';
import { useAddIdentifier, type IdentifierType } from '@/entities/item';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/api';
import { createAddIdentifierSchema } from '../model/item.schema';

interface AddIdentifierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: number;
}

function useAddIdentifierForm(itemId: number, onClose: () => void) {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [type, setType] = useState<IdentifierType>('IMEI');
  const [value, setValue] = useState('');

  const { mutate: addIdentifier, isPending } = useAddIdentifier();
  const schema = createAddIdentifierSchema(t);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldError(null);
    const validation = schema.safeParse({ type, value });
    if (!validation.success) {
      return setFieldError(validation.error.issues[0]?.message ?? t('common.error'));
    }

    addIdentifier(
      { id: itemId, payload: { type, value: value.trim().toUpperCase() } },
      {
        onSuccess: () => {
          toast.success(t('items.identifierAddedSuccess'));
          onClose();
        },
        onError: (err) => {
          const msg = getApiErrorMessage(err);
          setErrorMessage(getApiErrorStatus(err) === 409
            ? (msg ?? t('items.duplicateIdentifier'))
            : (msg ?? t('common.error')));
        },
      },
    );
  };

  return { type, setType, value, setValue, fieldError, errorMessage, isPending, submit };
}

function AddIdentifierContent({
  itemId,
  onClose,
}: {
  itemId: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const form = useAddIdentifierForm(itemId, onClose);

  return (
    <form onSubmit={form.submit} className="space-y-4 pt-2">
      <FormError message={form.errorMessage} />

      <SelectField
        label={t('items.identifierType')}
        value={form.type}
        onValueChange={(val) => form.setType(val as IdentifierType)}
        disabled={form.isPending}
        options={[
          { value: 'IMEI', label: 'IMEI' },
          { value: 'SERIAL', label: 'SERIAL' },
          { value: 'SYSTEM_CODE', label: t('items.identifierTypes.SYSTEM_CODE') },
        ]}
      />

      <div className="space-y-1">
        <Label htmlFor="identifier-val">
          {t('items.identifierValue')}
        </Label>
        <Input
          id="identifier-val"
          value={form.value}
          onChange={(e) => form.setValue(e.target.value)}
          placeholder={form.type === 'IMEI' ? t('items.placeholderImei') : t('items.placeholderSerial')}
          disabled={form.isPending}
          className={form.fieldError ? 'border-launch-orange' : ''}
        />
        {form.fieldError && (
          <p className="text-xs text-launch-orange font-medium">{form.fieldError}</p>
        )}
      </div>

      <DialogFormFooter onClose={onClose} isPending={form.isPending} />
    </form>
  );
}

/** Dialog for attaching an identifier to an existing device item. */
export function AddIdentifierDialog({
  open,
  onOpenChange,
  itemId,
}: AddIdentifierDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-7">
        <DialogHeader>
          <DialogTitle>{t('items.addIdentifier')}</DialogTitle>
        </DialogHeader>
        {open && (
          <AddIdentifierContent
            key={`add-id-${itemId}`}
            itemId={itemId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
