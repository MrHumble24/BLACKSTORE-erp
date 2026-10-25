import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFormFooter, DialogHeader, DialogTitle, Form, TextField } from '@/shared/ui';
import { normalizeMoney } from '@/shared/lib';
import { getApiErrorMessage } from '@/shared/api';
import { useUpdateBusinessDay, type ClosedDaySnapshot } from '@/entities/business-day';
import { createEditClosedDaySchema, NOTE_MAX, type EditClosedDayValues } from '../model/editClosedDay.schema';
import { CountedField } from './CountedField';

/** Form body: counted cash/card (with frozen expected + live variance) and the note. */
function EditClosedDayForm({ day, onClose }: { day: ClosedDaySnapshot; onClose: () => void }) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useUpdateBusinessDay();
  const form = useForm<EditClosedDayValues>({
    resolver: zodResolver(createEditClosedDaySchema(t)),
    defaultValues: { countedCash: day.countedCash ?? '', countedCard: day.countedCard ?? '', note: day.note ?? '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync({
        id: day.id,
        countedCash: normalizeMoney(values.countedCash),
        countedCard: normalizeMoney(values.countedCard),
        note: values.note.trim() || null,
      });
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? t('closeDay.updateFailed'));
    }
  });

  const shared = { control: form.control, register: form.register, disabled: isPending };
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-3 pt-2">
        <CountedField name="countedCash" label={t('closeDay.cashDrawer')} expected={day.expectedCash}
          error={errors.countedCash?.message} {...shared} />
        <CountedField name="countedCard" label={t('closeDay.card')} expected={day.expectedCard}
          error={errors.countedCard?.message} {...shared} />
        <TextField id="edit-day-note" label={t('closeDay.note')} maxLength={NOTE_MAX}
          disabled={isPending} {...form.register('note')} />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}

interface EditClosedDayDialogProps {
  day: ClosedDaySnapshot;
  onOpenChange: (open: boolean) => void;
}

/** Admin correction of a closed day's counted totals and note; expected values stay frozen (F28).
 * Mounted only while editing, so it is always open; closing calls onOpenChange(false) and the caller unmounts it. */
export function EditClosedDayDialog({ day, onOpenChange }: EditClosedDayDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-7">
        <DialogHeader>
          <DialogTitle>{t('closeDay.editTitle')}</DialogTitle>
          <DialogDescription>{t('closeDay.editHint')}</DialogDescription>
        </DialogHeader>
        <EditClosedDayForm day={day} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
