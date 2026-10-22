import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
  Input, SelectField,
} from '@/shared/ui';
import type { InvestorTransactionFormValues } from '../model/investor.schema';

/** Deposit/payout type select and the amount input. */
function TransactionBaseFields({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const { control } = useFormContext<InvestorTransactionFormValues>();

  return (
    <>
      <FormField
        control={control}
        name="type"
        render={({ field, fieldState }) => (
          <SelectField
            label={t('investors.transactionType')}
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
            placeholder={t('investors.selectTransactionType')}
            error={fieldState.error?.message}
            options={[
              { value: 'DEPOSIT', label: t('investors.deposit') },
              { value: 'PAYOUT', label: t('investors.payout') },
            ]}
          />
        )}
      />
      <FormField
        control={control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('investors.amount')}</FormLabel>
            <FormControl>
              <Input inputMode="decimal" disabled={disabled} placeholder={t('investors.amountPlaceholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

/** Optional date (defaults to today) and note inputs. */
function TransactionMetaFields({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const { control } = useFormContext<InvestorTransactionFormValues>();

  return (
    <>
      <FormField
        control={control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('investors.date')}</FormLabel>
            <FormControl>
              <Input type="date" disabled={disabled} {...field} />
            </FormControl>
            <FormDescription>{t('investors.dateHelp')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('investors.note')}</FormLabel>
            <FormControl>
              <Input disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

interface InvestorTransactionFieldsProps {
  disabled: boolean;
}

/** Type, amount, date and note inputs for a deposit/payout transaction. */
export function InvestorTransactionFields({ disabled }: InvestorTransactionFieldsProps) {
  return (
    <>
      <TransactionBaseFields disabled={disabled} />
      <TransactionMetaFields disabled={disabled} />
    </>
  );
}
