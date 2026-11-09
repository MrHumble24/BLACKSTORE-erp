import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { MATCH_TRANSITIONS, useChangeMatchStatus, type Match } from '@/entities/match';

/** One button per allowed next status (Seen, Contacted, Bought, Ignore, Restore); none for BOUGHT. */
export function MatchStatusActions({ match }: { match: Match }) {
  const { t } = useTranslation();
  const { mutate: changeStatus, isPending } = useChangeMatchStatus();

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {MATCH_TRANSITIONS[match.status].map((to) => (
        <Button
          key={to}
          variant="outline"
          size="sm"
          disabled={isPending}
          className="h-7 rounded-full px-3 text-[11px] font-normal"
          onClick={() =>
            changeStatus(
              { id: match.id, status: to },
              { onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')) },
            )
          }
        >
          {t(`matches.actions.${to}`)}
        </Button>
      ))}
    </div>
  );
}
