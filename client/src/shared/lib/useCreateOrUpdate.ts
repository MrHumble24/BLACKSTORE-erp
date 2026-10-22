import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api';

interface MutationOptions {
  onSuccess?: () => void;
  onError?: (err: unknown) => void;
}

interface UseCreateOrUpdateOptions<TCreate, TUpdate> {
  create: (payload: TCreate, options?: MutationOptions) => void;
  update: (payload: TUpdate, options?: MutationOptions) => void;
  isPending: boolean;
  isEditing: boolean;
  successMessage: string;
  onDone: () => void;
}

/**
 * Reusable create-vs-update submission hook for forms with API error handling and toast feedback.
 */
export function useCreateOrUpdate<TCreate, TUpdate = TCreate>({
  create,
  update,
  isPending,
  isEditing,
  successMessage,
  onDone,
}: UseCreateOrUpdateOptions<TCreate, TUpdate>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);

  const submit = (createPayload: TCreate, updatePayload?: TUpdate) => {
    setApiError(null);
    const onSuccess = () => {
      toast.success(successMessage);
      onDone();
    };
    const onError = (err: unknown) => setApiError(getApiErrorMessage(err) ?? t('common.error'));

    if (isEditing) {
      update((updatePayload ?? createPayload) as unknown as TUpdate, { onSuccess, onError });
    } else {
      create(createPayload, { onSuccess, onError });
    }
  };

  return {
    submit,
    apiError,
    setApiError,
    isPending,
  };
}
