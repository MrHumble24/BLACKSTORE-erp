import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/shared/ui';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/api';
import { useUpdateUser, type User } from '@/entities/user';

interface ToggleUserStatusButtonProps {
  user: User;
}

/** Apple-styled toggle status button for activating or deactivating user accounts. */
export function ToggleUserStatusButton({ user }: ToggleUserStatusButtonProps) {
  const { t } = useTranslation();
  const { mutate: updateUser, isPending } = useUpdateUser();

  const handleToggle = () => {
    updateUser(
      { id: user.id, payload: { isActive: !user.isActive } },
      {
        onSuccess: () => {
          toast.success(t('users.updatedSuccess'));
        },
        onError: (err) => {
          // 400 while deactivating means the server protected the last active Admin (contract).
          const isLastAdmin = user.isActive && getApiErrorStatus(err) === 400;
          if (isLastAdmin) {
            toast.error(t('users.lastAdminError'));
          } else {
            toast.error(getApiErrorMessage(err) ?? t('common.error'));
          }
        },
      },
    );
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className={
        user.isActive
          ? 'h-7.5 px-3.5 rounded-full border border-hairline-silver bg-gallery-white text-slate hover:text-launch-orange hover:border-launch-orange/40 text-xs font-normal shrink-0 transition-colors cursor-pointer min-w-[96px]'
          : 'h-7.5 px-3.5 rounded-full border border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal shrink-0 transition-colors cursor-pointer min-w-[96px]'
      }
    >
      {user.isActive ? t('users.deactivate') : t('users.activate')}
    </Button>
  );
}
