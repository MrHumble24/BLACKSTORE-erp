import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ActiveToggleButton } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useUpdateWatch } from '../api';
import type { Watch } from '../model/types';

/** Switches a watch on or off from the watches table (PATCH isActive). */
export function WatchActiveToggle({ watch }: { watch: Watch }) {
  const { t } = useTranslation();
  const { mutate: update, isPending } = useUpdateWatch();

  const handleToggle = () => {
    update(
      { id: watch.id, payload: { isActive: !watch.isActive } },
      {
        onSuccess: () => toast.success(t('watches.updatedSuccess')),
        onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  };

  return <ActiveToggleButton isActive={watch.isActive} isPending={isPending} onToggle={handleToggle} />;
}
