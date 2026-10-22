import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/shared/api';

/**
 * Reusable helper hook that executes an async action and captures API errors in state.
 */
export function useSubmitWithError() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const runWithCatch = async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    setError(null);
    try {
      return await action();
    } catch (err) {
      setError(getApiErrorMessage(err) || t('common.error'));
      return undefined;
    }
  };

  return { error, setError, runWithCatch };
}
