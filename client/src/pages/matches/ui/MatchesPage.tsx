import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TablePagination } from '@/shared/ui';
import { MATCH_STATUSES, useMatches, type MatchStatus } from '@/entities/match';
import { MatchesFilters } from './MatchesFilters';
import { MatchesTable } from './MatchesTable';

const PAGE_SIZE = 20;

/** Reads ?status= (e.g. NEW from the home page) as the initial filter. */
function useInitialStatus(): MatchStatus | undefined {
  const [searchParams] = useSearchParams();
  const param = searchParams.get('status');
  return MATCH_STATUSES.find((s) => s === param);
}

/** Offers page (F34, manage_watches): Telegram posts matched to a watch, refreshed every 15 s. */
export function MatchesPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MatchStatus | undefined>(useInitialStatus());
  const [watchId, setWatchId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const { data: matchPage, isLoading } = useMatches({ page, pageSize: PAGE_SIZE, status, watchId });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{t('matches.title')}</h1>
        <p className="text-xs text-slate mt-0.5">{t('matches.subtitle')}</p>
      </div>
      <MatchesFilters
        status={status}
        watchId={watchId}
        onStatusChange={(s) => { setStatus(s); setPage(1); }}
        onWatchChange={(id) => { setWatchId(id); setPage(1); }}
      />
      <MatchesTable matches={matchPage?.items ?? []} isLoading={isLoading} />
      {matchPage && matchPage.total > 0 && (
        <TablePagination
          page={page}
          totalPages={Math.max(1, Math.ceil(matchPage.total / matchPage.pageSize))}
          total={matchPage.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
