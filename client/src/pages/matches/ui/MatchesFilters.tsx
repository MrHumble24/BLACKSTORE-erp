import { useTranslation } from 'react-i18next';
import { SelectField } from '@/shared/ui';
import { MATCH_STATUSES, type MatchStatus } from '@/entities/match';
import { useWatches } from '@/entities/watch';

const ALL = 'ALL';
// ponytail: the watch filter lists the first 100 watches (server page cap); add search-on-type if the owner keeps more.
const WATCH_OPTIONS_LIMIT = 100;

interface MatchesFiltersProps {
  status?: MatchStatus;
  watchId?: number;
  onStatusChange: (status?: MatchStatus) => void;
  onWatchChange: (watchId?: number) => void;
}

/** Status and watch filters for the offers table. */
export function MatchesFilters({ status, watchId, onStatusChange, onWatchChange }: MatchesFiltersProps) {
  const { t } = useTranslation();
  const { data: watchPage } = useWatches(1, WATCH_OPTIONS_LIMIT);

  return (
    <div className="grid gap-3 sm:grid-cols-[12rem_16rem]">
      <SelectField
        label={t('matches.status')}
        value={status ?? ALL}
        onValueChange={(v) => onStatusChange(v === ALL ? undefined : (v as MatchStatus))}
        options={[
          { value: ALL, label: t('matches.allStatuses') },
          ...MATCH_STATUSES.map((s) => ({ value: s, label: t(`matches.statuses.${s}`) })),
        ]}
      />
      <SelectField
        searchable
        label={t('matches.watch')}
        value={watchId ? String(watchId) : ''}
        onValueChange={(v) => onWatchChange(v ? Number(v) : undefined)}
        placeholder={t('matches.allWatches')}
        options={(watchPage?.items ?? []).map((w) => ({ value: String(w.id), label: w.name }))}
      />
    </div>
  );
}
