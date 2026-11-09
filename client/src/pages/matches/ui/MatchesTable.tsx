import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  TableLoadingRow, TableEmptyRow, Badge,
} from '@/shared/ui';
import { cn, formatDate, formatMoney } from '@/shared/lib';
import { isTelegramLink, type Match, type MatchStatus } from '@/entities/match';
import { MatchNoteButton, MatchStatusActions } from '@/features/manage-matches';

const COLUMNS = 10;

const STATUS_STYLE: Record<MatchStatus, string> = {
  NEW: 'bg-pricing-blue/10 text-pricing-blue',
  SEEN: 'bg-control-gray text-ink',
  CONTACTED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  BOUGHT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  IGNORED: 'bg-control-gray/60 text-slate',
};

/** Seller post text clamped to two lines, with the replied-to post above it when present. */
function MessageCell({ match }: { match: Match }) {
  return (
    <div className="max-w-xs space-y-0.5" title={match.messageText}>
      {match.parentText && <p className="line-clamp-1 text-[11px] text-slate">↩ {match.parentText}</p>}
      <p className="line-clamp-2 whitespace-pre-line">{match.messageText}</p>
    </div>
  );
}

/** One offer row; NEW offers are bold until marked Seen. */
function MatchRow({ match }: { match: Match }) {
  const { t } = useTranslation();
  return (
    <TableRow className={cn('align-top text-xs', match.status === 'NEW' && 'font-semibold')}>
      <TableCell className="whitespace-nowrap text-slate">{formatDate(match.receivedAt, true)}</TableCell>
      <TableCell>{match.watch.name}</TableCell>
      <TableCell>
        {match.device}
        {match.condition && (
          <span className="block text-[11px] font-normal text-slate">
            {t(`matches.condition.${match.condition}`, { defaultValue: match.condition })}
          </span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right tabular-nums">
        {match.price ? [formatMoney(match.price), match.currency].filter(Boolean).join(' ') : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">{Math.round(Number(match.confidence) * 100)}%</TableCell>
      <TableCell>
        {match.sellerName ?? '—'}
        {match.sellerUsername && <span className="block text-[11px] font-normal text-slate">@{match.sellerUsername}</span>}
      </TableCell>
      <TableCell><MessageCell match={match} /></TableCell>
      <TableCell>
        {match.messageLink === null ? (
          <span className="text-slate">—</span>
        ) : isTelegramLink(match.messageLink) ? (
          <a href={match.messageLink} target="_blank" rel="noopener noreferrer" aria-label={t('matches.openMessage')} className="text-pricing-blue">
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span className="break-all text-[11px] text-slate">{match.messageLink}</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={cn('border-0 px-2 py-0 text-[11px]', STATUS_STYLE[match.status])}>
          {t(`matches.statuses.${match.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="space-y-1 text-right font-normal">
        <MatchStatusActions match={match} />
        <MatchNoteButton match={match} />
      </TableCell>
    </TableRow>
  );
}

/** Offers table, newest first (server order). */
export function MatchesTable({ matches, isLoading }: { matches: Match[]; isLoading: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white overflow-x-auto shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-control-gray/30 text-[11px]">
            <TableHead>{t('matches.received')}</TableHead>
            <TableHead>{t('matches.watch')}</TableHead>
            <TableHead>{t('matches.device')}</TableHead>
            <TableHead className="text-right">{t('matches.price')}</TableHead>
            <TableHead className="text-right">{t('matches.confidence')}</TableHead>
            <TableHead>{t('matches.seller')}</TableHead>
            <TableHead>{t('matches.message')}</TableHead>
            <TableHead>{t('matches.link')}</TableHead>
            <TableHead>{t('matches.status')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingRow colSpan={COLUMNS} />
          ) : matches.length === 0 ? (
            <TableEmptyRow colSpan={COLUMNS} message={t('matches.noMatches')} />
          ) : (
            matches.map((m) => <MatchRow key={m.id} match={m} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}
