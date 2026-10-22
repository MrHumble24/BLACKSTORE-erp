import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { DialogFormFooter, FormError, Form } from '@/shared/ui';
import { getTodayIso, normalizeMoney, useSubmitWithError } from '@/shared/lib';
import { useCreateLedgerEntry, useLedgerCategories } from '@/entities/ledger';
import { createLedgerSchema, type LedgerFormValues } from '../model/ledger.schema';
import { LedgerEntryFields } from './LedgerEntryFields';

/** Form body for recording an income or expense entry (create-only; BR-12 bans edits). */
export function LedgerEntryContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [todayIso] = useState(() => getTodayIso());
  const { data: categories = [] } = useLedgerCategories();
  const { error, runWithCatch } = useSubmitWithError();
  const { mutateAsync, isPending } = useCreateLedgerEntry();

  const form = useForm<LedgerFormValues>({
    resolver: zodResolver(createLedgerSchema(t)),
    defaultValues: { type: 'EXPENSE', category: '', amount: '', date: todayIso, note: '', countsInProfit: false },
  });
  const isIncome = useWatch({ control: form.control, name: 'type' }) === 'INCOME';

  const onSubmit = form.handleSubmit(async (values) => {
    const entry = await runWithCatch(() =>
      mutateAsync({
        type: values.type,
        category: values.category.trim(),
        amount: normalizeMoney(values.amount),
        ...(values.date.trim() ? { date: values.date.trim() } : {}),
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
        ...(values.type === 'INCOME' ? { countsInProfit: values.countsInProfit } : {}),
      }),
    );
    if (entry) {
      toast.success(t('ledger.createdSuccess'));
      onClose();
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={error} />
        <LedgerEntryFields
          control={form.control}
          register={form.register}
          errors={form.formState.errors}
          categories={categories}
          isIncome={isIncome}
          disabled={isPending}
        />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
