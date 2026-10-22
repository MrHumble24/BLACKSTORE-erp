import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
  Input, SelectField,
} from '@/shared/ui';
import type { InvestorFormValues } from '../model/investor.schema';

/** Investor name and code inputs. */
function InvestorIdentityFields({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const { control } = useFormContext<InvestorFormValues>();

  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('investors.name')}</FormLabel>
            <FormControl>
              <Input disabled={disabled} placeholder={t('investors.namePlaceholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('investors.code')}</FormLabel>
            <FormControl>
              <Input disabled={disabled} placeholder={t('investors.codePlaceholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

/** Share value input, only shown for PERCENT and FIXED_PER_ITEM. */
function InvestorShareValueField({ disabled, shareType }: { disabled: boolean; shareType: string }) {
  const { t } = useTranslation();
  const { control } = useFormContext<InvestorFormValues>();

  return (
    <FormField
      control={control}
      name="shareValue"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('investors.shareValue')}</FormLabel>
          <FormControl>
            <Input
              inputMode="decimal"
              disabled={disabled}
              placeholder={shareType === 'PERCENT' ? '70.00' : '30.00'}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Share type select plus the conditional value input. */
function InvestorShareFields({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const { control, watch } = useFormContext<InvestorFormValues>();
  const shareType = watch('shareType');

  return (
    <>
      <FormField
        control={control}
        name="shareType"
        render={({ field, fieldState }) => (
          <SelectField
            label={t('investors.shareType')}
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
            placeholder={t('investors.selectShareType')}
            error={fieldState.error?.message}
            options={[
              { value: 'NONE', label: t('investors.shareNone') },
              { value: 'PERCENT', label: t('investors.sharePercent') },
              { value: 'FIXED_PER_ITEM', label: t('investors.shareFixed') },
            ]}
          />
        )}
      />
      {shareType !== 'NONE' && (
        <InvestorShareValueField disabled={disabled} shareType={shareType} />
      )}
    </>
  );
}

interface InvestorFormFieldsProps {
  disabled: boolean;
}

/** Name, code, shareType select and the conditional shareValue input. */
export function InvestorFormFields({ disabled }: InvestorFormFieldsProps) {
  return (
    <>
      <InvestorIdentityFields disabled={disabled} />
      <InvestorShareFields disabled={disabled} />
    </>
  );
}
