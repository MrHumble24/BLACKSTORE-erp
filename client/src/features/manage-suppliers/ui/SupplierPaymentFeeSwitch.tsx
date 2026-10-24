import { useTranslation } from 'react-i18next';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Label, Switch } from '@/shared/ui';
import type { SupplierPaymentFormValues } from '../model/supplier.schema';

interface FeeSwitchProps {
  control: Control<SupplierPaymentFormValues>;
  setValue: UseFormSetValue<SupplierPaymentFormValues>;
  disabled: boolean;
  investorName: string;
}

/**
 * "{{name}} pays the fee" switch for a supplier linked to an investor (F26). Off = the business
 * bears the fee; on = feePaidBy INVESTOR, borne by the linked investor (no investorId needed).
 */
export function SupplierPaymentFeeSwitch({ control, setValue, disabled, investorName }: FeeSwitchProps) {
  const { t } = useTranslation();
  // useWatch (not watch) so the switch re-renders on setValue.
  const feePaidBy = useWatch({ control, name: 'feePaidBy' });

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <Label>{t('investors.account.feeByInvestor', { name: investorName })}</Label>
        <Switch
          checked={feePaidBy === 'INVESTOR'}
          onCheckedChange={(on) => setValue('feePaidBy', on ? 'INVESTOR' : 'BUSINESS')}
          disabled={disabled}
        />
      </div>
      <p className="text-[11px] text-slate">{t('suppliers.feePaidByHint')}</p>
    </div>
  );
}
