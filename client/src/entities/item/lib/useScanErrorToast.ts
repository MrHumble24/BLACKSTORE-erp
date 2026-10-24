import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api';

type FailHandler = (error: unknown) => void;

/** Toast failure handler; when the API cites item #N, adds a link to that device. */
export function useScanErrorToast(): FailHandler {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (error) => {
    const message = getApiErrorMessage(error) ?? t('common.error');
    // 409 duplicates cite the owner, e.g. "already belongs to item #42": jump there.
    const existing = message.match(/#(\d+)/);
    toast.error(message, existing ? {
      action: { label: t('items.openItem'), onClick: () => navigate(`/items/${existing[1]}`) },
    } : undefined);
  };
}
