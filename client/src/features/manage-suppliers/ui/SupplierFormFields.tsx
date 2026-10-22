import { useTranslation } from 'react-i18next';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { TextField } from '@/shared/ui';
import type {
  SupplierFormValues,
  SupplierPaymentFormValues,
} from '../model/supplier.schema';

interface SupplierFormFieldsProps {
  register: UseFormRegister<SupplierFormValues>;
  errors: FieldErrors<SupplierFormValues>;
  disabled: boolean;
}

/** Name, country, phone and note inputs for the supplier form. */
export function SupplierFormFields({ register, errors, disabled }: SupplierFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <TextField
        id="supplier-name"
        label={t('suppliers.name')}
        {...register('name')}
        error={errors.name?.message}
        disabled={disabled}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField
          id="supplier-country"
          label={t('suppliers.country')}
          {...register('country')}
          disabled={disabled}
        />
        <TextField
          id="supplier-phone"
          label={t('suppliers.phone')}
          {...register('phone')}
          disabled={disabled}
        />
      </div>
      <TextField
        id="supplier-note"
        label={t('suppliers.note')}
        {...register('note')}
        disabled={disabled}
      />
    </div>
  );
}

interface SupplierPaymentFieldsProps {
  register: UseFormRegister<SupplierPaymentFormValues>;
  errors: FieldErrors<SupplierPaymentFormValues>;
  disabled: boolean;
}

/** Amount (may be negative), fee and note inputs for the payment dialog. */
export function SupplierPaymentFields({ register, errors, disabled }: SupplierPaymentFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <TextField
        id="payment-amount"
        label={t('suppliers.amount')}
        {...register('amount')}
        error={errors.amount?.message}
        disabled={disabled}
      />

      <p className="text-[11px] text-slate -mt-1">{t('suppliers.amountHint')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField
          id="payment-fee"
          label={t('suppliers.fee')}
          {...register('fee')}
          error={errors.fee?.message}
          disabled={disabled}
        />
        <TextField
          id="payment-date"
          label={t('suppliers.date')}
          type="date"
          hint={t('investors.dateHelp')}
          {...register('date')}
          disabled={disabled}
        />
      </div>

      <TextField
        id="payment-note"
        label={t('suppliers.note')}
        {...register('note')}
        disabled={disabled}
      />
    </div>
  );
}
