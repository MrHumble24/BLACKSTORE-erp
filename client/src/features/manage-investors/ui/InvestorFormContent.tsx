import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, DialogFormFooter, FormError } from '@/shared/ui';
import { useCreateOrUpdate } from '@/shared/lib';
import {
  useCreateInvestor,
  useUpdateInvestor,
  type Investor,
  type CreateInvestorPayload,
  type UpdateInvestorPayload,
} from '@/entities/investor';
import { createInvestorSchema, type InvestorFormValues } from '../model/investor.schema';
import { InvestorFormFields } from './InvestorFormFields';

interface InvestorFormContentProps {
  investor: Investor | null;
  onClose: () => void;
}

/** Form setup for the investor dialog (localized schema + defaults per create/edit). */
function useInvestorForm(t: (k: string) => string, investor: Investor | null) {
  return useForm<InvestorFormValues>({
    resolver: zodResolver(createInvestorSchema(t)),
    defaultValues: {
      name: investor?.name ?? '',
      code: investor?.code ?? '',
      shareType: investor?.shareType ?? 'NONE',
      shareValue: investor?.shareValue ?? '',
      shipsDevices: true,
      supplierId: investor?.supplier ? String(investor.supplier.id) : '',
    },
  });
}

/** Share fields of the payload; shareValue is only sent for PERCENT and FIXED_PER_ITEM. */
function shareFields(values: InvestorFormValues): Pick<CreateInvestorPayload, 'shareType' | 'shareValue'> {
  return values.shareType === 'NONE'
    ? { shareType: 'NONE' }
    : { shareType: values.shareType, shareValue: values.shareValue.replace(',', '.') };
}

/** Create payload: identity, share and the "sends us devices" flag (F26). */
function buildCreatePayload(values: InvestorFormValues): CreateInvestorPayload {
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    ...shareFields(values),
    shipsDevices: values.shipsDevices,
  };
}

/** Update payload: identity, share and, only when it changed, the supplier link (null unlinks). */
function buildUpdatePayload(values: InvestorFormValues, investor: Investor): UpdateInvestorPayload {
  const current = investor.supplier ? String(investor.supplier.id) : '';
  const linkChanged = !investor.isOwn && values.supplierId !== current;
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    ...shareFields(values),
    ...(linkChanged ? { supplierId: values.supplierId ? Number(values.supplierId) : null } : {}),
  };
}

/** shadcn form body for creating and editing investors. */
export function InvestorFormContent({ investor, onClose }: InvestorFormContentProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(investor);

  const { mutate: create, isPending: isCreating } = useCreateInvestor();
  const { mutate: update, isPending: isUpdating } = useUpdateInvestor();

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (p: CreateInvestorPayload, opt) => create(p, opt),
    update: (p: UpdateInvestorPayload, opt) => {
      if (investor) update({ id: investor.id, payload: p }, opt);
    },
    isPending: isCreating || isUpdating,
    isEditing,
    successMessage: t(isEditing ? 'investors.updatedSuccess' : 'investors.createdSuccess'),
    onDone: onClose,
  });

  const form = useInvestorForm(t, investor);

  const onSubmit = form.handleSubmit((values) =>
    submit(buildCreatePayload(values), investor ? buildUpdatePayload(values, investor) : undefined),
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <InvestorFormFields disabled={isPending} investor={investor} />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}

