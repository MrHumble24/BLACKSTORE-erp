import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, DialogFormFooter, FormError } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import {
  useCreateInvestorTransaction,
  type CreateInvestorTransactionPayload,
} from '@/entities/investor';
import {
  createInvestorTransactionSchema,
  type InvestorTransactionFormValues,
} from '../model/investor.schema';
import { InvestorTransactionFields } from './InvestorTransactionFields';

interface InvestorTransactionContentProps {
  investorId: number;
  onClose: () => void;
}

/** Returns current date formatted as YYYY-MM-DD. */
function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** shadcn form body for recording a deposit or payout; a wrong amount is fixed by a correcting entry. */
export function InvestorTransactionContent({ investorId, onClose }: InvestorTransactionContentProps) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [todayIso] = useState(getTodayIso);

  const { mutate: create, isPending } = useCreateInvestorTransaction();

  const form = useForm<InvestorTransactionFormValues>({
    resolver: zodResolver(createInvestorTransactionSchema(t)),
    defaultValues: {
      type: 'DEPOSIT',
      amount: '',
      date: todayIso,
      note: '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setApiError(null);
    const payload: CreateInvestorTransactionPayload = {
      type: values.type,
      amount: values.amount.replace(',', '.'),
      date: values.date?.trim() || undefined,
      ...(values.note.trim() ? { note: values.note.trim() } : {}),
    };

    create(
      { id: investorId, payload },
      {
        onSuccess: () => {
          toast.success(t('investors.transactionAddedSuccess'));
          onClose();
        },
        onError: (err) => setApiError(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <InvestorTransactionFields disabled={isPending} />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
