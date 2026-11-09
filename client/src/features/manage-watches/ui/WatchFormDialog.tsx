import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Form, DialogFormFooter, FormError } from '@/shared/ui';
import { useCreateOrUpdate } from '@/shared/lib';
import {
  useCreateWatch,
  useUpdateWatch,
  type Watch,
  type CreateWatchPayload,
  type UpdateWatchPayload,
} from '@/entities/watch';
import {
  createWatchSchema,
  watchToFormValues,
  toCreatePayload,
  toUpdatePayload,
  type WatchFormValues,
} from '../model/watch.schema';
import { WatchFormFields } from './WatchFormFields';

interface WatchFormContentProps {
  watch: Watch | null;
  onClose: () => void;
}

/** Form body: validates with zod, then creates or updates the watch. */
function WatchFormContent({ watch, onClose }: WatchFormContentProps) {
  const { t } = useTranslation();
  const { mutate: create, isPending: isCreating } = useCreateWatch();
  const { mutate: update, isPending: isUpdating } = useUpdateWatch();
  const form = useForm<WatchFormValues>({
    resolver: zodResolver(createWatchSchema(t)),
    defaultValues: watchToFormValues(watch),
  });

  const { submit, apiError, isPending } = useCreateOrUpdate<
    CreateWatchPayload,
    { id: number; payload: UpdateWatchPayload }
  >({
    create: (payload, opts) => create(payload, opts),
    update: (payload, opts) => update(payload, opts),
    isPending: isCreating || isUpdating,
    isEditing: Boolean(watch),
    successMessage: t(watch ? 'watches.updatedSuccess' : 'watches.createdSuccess'),
    onDone: onClose,
  });

  const onSubmit = form.handleSubmit((values) => {
    submit(toCreatePayload(values), watch ? { id: watch.id, payload: toUpdatePayload(values) } : undefined);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <WatchFormFields disabled={isPending} currentModel={watch?.productModel} />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}

interface WatchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watch?: Watch | null;
}

/** Dialog for creating or editing a Watcher watch. */
export function WatchFormDialog({ open, onOpenChange, watch }: WatchFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-7">
        <DialogHeader>
          <DialogTitle>{watch ? t('watches.editWatch') : t('watches.addWatch')}</DialogTitle>
        </DialogHeader>
        {open && (
          <WatchFormContent
            key={watch ? `edit-${watch.id}` : 'create'}
            watch={watch ?? null}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
