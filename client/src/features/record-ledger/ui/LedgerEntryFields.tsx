import { useTranslation } from 'react-i18next';
import { Controller, type Control, type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { SelectField, TextField, Label, Switch } from '@/shared/ui';
import type { LedgerFormValues } from '../model/ledger.schema';

interface FieldsProps {
  control: Control<LedgerFormValues>;
  register: UseFormRegister<LedgerFormValues>;
  errors: FieldErrors<LedgerFormValues>;
  categories: string[];
  isIncome: boolean;
  disabled: boolean;
}

/** Type select + category input with a datalist of known categories. */
function TypeAndCategory({ control, register, errors, categories, disabled }: Omit<FieldsProps, 'isIncome'>) {
  const { t } = useTranslation();
  return (
    <>
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <SelectField
            label={t('ledger.type')}
            required
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
            options={[
              { value: 'INCOME', label: t('ledger.income') },
              { value: 'EXPENSE', label: t('ledger.expense') },
            ]}
          />
        )}
      />
      <TextField id="ledger-category" label={t('ledger.category')} list="ledger-categories"
        error={errors.category?.message} disabled={disabled} {...register('category')} />
      <datalist id="ledger-categories">
        {categories.map((c) => <option key={c} value={c} />)}
      </datalist>
    </>
  );
}

/** Amount, date and note inputs. */
function AmountDateNote({ register, errors, disabled }: Pick<FieldsProps, 'register' | 'errors' | 'disabled'>) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField id="ledger-amount" label={t('ledger.amount')} placeholder="0.00"
          error={errors.amount?.message} disabled={disabled} {...register('amount')} />
        <TextField id="ledger-date" label={t('ledger.date')} type="date"
          hint={t('ledger.dateHelp')} disabled={disabled} {...register('date')} />
      </div>
      <TextField id="ledger-note" label={t('ledger.note')} disabled={disabled} {...register('note')} />
    </>
  );
}

/** All inputs of the ledger entry form; the "counts in profit" toggle shows only for income. */
export function LedgerEntryFields({ control, register, errors, categories, isIncome, disabled }: FieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <TypeAndCategory control={control} register={register} errors={errors} categories={categories} disabled={disabled} />
      <AmountDateNote register={register} errors={errors} disabled={disabled} />
      <Controller
        control={control}
        name="inCash"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 px-3 py-2.5">
            <div>
              <Label htmlFor="ledger-in-cash" className="text-xs">{t('ledger.inCash')}</Label>
              <p className="text-[11px] text-slate">{field.value ? t('ledger.fromCash') : t('ledger.fromBank')}</p>
            </div>
            <Switch id="ledger-in-cash" checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </div>
        )}
      />
      {isIncome && (
        <Controller
          control={control}
          name="countsInProfit"
          render={({ field }) => (
            <div className="flex items-center justify-between rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 px-3 py-2.5">
              <Label htmlFor="counts-in-profit" className="text-xs">{t('ledger.countsInProfit')}</Label>
              <Switch id="counts-in-profit" checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
            </div>
          )}
        />
      )}
    </div>
  );
}
