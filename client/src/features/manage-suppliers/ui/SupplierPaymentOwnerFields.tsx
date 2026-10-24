import { useTranslation } from 'react-i18next';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { SelectField } from '@/shared/ui';
import { useInvestors } from '@/entities/investor';
import type { SupplierPaymentFormValues } from '../model/supplier.schema';

/** Radix Select rejects '' as an item value, so the business option uses this sentinel. */
const BUSINESS = 'business';

interface OwnerFieldsProps {
  control: Control<SupplierPaymentFormValues>;
  setValue: UseFormSetValue<SupplierPaymentFormValues>;
  disabled: boolean;
}

/** "Whose money": business (own money) or an active, non-business investor. */
function InvestorSelect({ control, setValue, disabled }: OwnerFieldsProps) {
  const { t } = useTranslation();
  const { data: investors = [] } = useInvestors();
  // useWatch (not watch) so the select re-renders on setValue.
  const investorId = useWatch({ control, name: 'investorId' });

  return (
    <SelectField
      label={t('suppliers.paymentInvestor')}
      value={investorId || BUSINESS}
      onValueChange={(val) =>
        setValue('investorId', val === BUSINESS ? '' : val, { shouldValidate: true })
      }
      disabled={disabled}
      options={[
        { value: BUSINESS, label: t('suppliers.paymentInvestorBusiness') },
        ...investors
          .filter((i) => !i.isOwn)
          .map((i) => ({ value: String(i.id), label: i.name, badge: i.code })),
      ]}
    />
  );
}

/** "Commission paid by", shown only when an investor's money is being sent. */
function FeePayerSelect({ control, setValue, disabled }: OwnerFieldsProps) {
  const { t } = useTranslation();
  const investorId = useWatch({ control, name: 'investorId' });
  const feePaidBy = useWatch({ control, name: 'feePaidBy' });
  if (!investorId) return null;

  return (
    <div className="space-y-1">
      <SelectField
        label={t('suppliers.feePaidBy')}
        value={feePaidBy}
        onValueChange={(val) =>
          setValue('feePaidBy', val as SupplierPaymentFormValues['feePaidBy'])
        }
        disabled={disabled}
        options={[
          { value: 'BUSINESS', label: t('suppliers.feePaidByBusiness') },
          { value: 'INVESTOR', label: t('suppliers.feePaidByInvestor') },
        ]}
      />
      <p className="text-[11px] text-slate">{t('suppliers.feePaidByHint')}</p>
    </div>
  );
}

/** Investor and fee-payer selects for the supplier payment dialog (F25). */
export function SupplierPaymentOwnerFields(props: OwnerFieldsProps) {
  return (
    <div className="space-y-3">
      <InvestorSelect {...props} />
      <FeePayerSelect {...props} />
    </div>
  );
}
