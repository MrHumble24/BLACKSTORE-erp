import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, DialogFormFooter, FormError } from '@/shared/ui';
import { useCreateOrUpdate } from '@/shared/lib';
import {
  useCreateLocation,
  useUpdateLocation,
  type Location,
  type CreateLocationPayload,
  type UpdateLocationPayload,
} from '@/entities/location';
import { createLocationSchema, type LocationFormValues } from '../model/location.schema';
import { LocationFormFields } from './LocationFormFields';

interface LocationFormContentProps {
  location: Location | null;
  onClose: () => void;
}

/** shadcn form body for creating and editing locations; shows API errors in the form. */
export function LocationFormContent({ location, onClose }: LocationFormContentProps) {
  const { t } = useTranslation();
  const { mutate: create, isPending: isCreating } = useCreateLocation();
  const { mutate: update, isPending: isUpdating } = useUpdateLocation();

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (p: CreateLocationPayload, opt) => create(p, opt),
    update: (p: UpdateLocationPayload, opt) => {
      if (location) update({ id: location.id, payload: p }, opt);
    },
    isPending: isCreating || isUpdating,
    isEditing: Boolean(location),
    successMessage: t(location ? 'locations.updatedSuccess' : 'locations.createdSuccess'),
    onDone: onClose,
  });

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(createLocationSchema(t)),
    defaultValues: {
      name: location?.name ?? '',
      type: location?.type ?? 'SHOP',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => submit(v))} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <LocationFormFields disabled={isPending} />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}

