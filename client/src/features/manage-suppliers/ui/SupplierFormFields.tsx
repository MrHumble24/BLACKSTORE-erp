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
  /** Linked-investor dialog (F26): date and note fold under "More"; amount and fee stay visible. */
  collapseMeta?: boolean;
}

/** Optional date (defaults to today) and note inputs of the payment dialog. */
function PaymentMetaFields({ register, disabled }: SupplierPaymentFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <TextField
        id="payment-date"
        label={t('suppliers.date')}
        type="date"
        hint={t('investors.dateHelp')}
        {...register('date')}
        disabled={disabled}
      />
      {/* Full width in the fee/date grid of the regular dialog; no effect when folded. */}
      <div className="md:col-span-2">
        <TextField
          id="payment-note"
          label={t('suppliers.note')}
          {...register('note')}
          disabled={disabled}
        />
      </div>
    </>
  );
}

/** Amount (may be negative), fee, date and note inputs for the payment dialog. */
export function SupplierPaymentFields(props: SupplierPaymentFieldsProps) {
  const { t } = useTranslation();
  const { register, errors, disabled, collapseMeta } = props;

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
      <div className={collapseMeta ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
        <TextField
          id="payment-fee"
          label={t('suppliers.fee')}
          {...register('fee')}
          error={errors.fee?.message}
          disabled={disabled}
        />
        {collapseMeta ? (
          <details className="pt-3">
            <summary className="cursor-pointer text-xs text-apple-blue hover:underline">
              {t('common.more')}
            </summary>
            <div className="space-y-3 pt-3">
              <PaymentMetaFields {...props} />
            </div>
          </details>
        ) : (
          <PaymentMetaFields {...props} />
        )}
      </div>
    </div>
  );
}
