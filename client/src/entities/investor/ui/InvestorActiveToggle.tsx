import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ActiveToggleButton } from '@/shared/ui';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/api';
import { useUpdateInvestor } from '../api';
import type { Investor } from '../model/types';

interface InvestorActiveToggleProps {
  investor: Investor;
}

/** Activates or deactivates an investor; the business (OWN) cannot be deactivated (contract). */
export function InvestorActiveToggle({ investor }: InvestorActiveToggleProps) {
  const { t } = useTranslation();
  const { mutate: update, isPending } = useUpdateInvestor();

  const handleToggle = () => {
    update(
      { id: investor.id, payload: { isActive: !investor.isActive } },
      {
        onSuccess: () => toast.success(t('investors.updatedSuccess')),
        onError: (err) => {
          // 400 means an attempt to deactivate the OWN investor (server rule).
          const isOwnDenied = investor.isActive && getApiErrorStatus(err) === 400;
          if (isOwnDenied) {
            toast.error(t('investors.ownDeactivateError'));
            return;
          }
          toast.error(getApiErrorMessage(err) ?? t('common.error'));
        },
      },
    );
  };

  return (
    <ActiveToggleButton
      isActive={investor.isActive}
      isPending={isPending}
      onToggle={handleToggle}
    />
  );
}
