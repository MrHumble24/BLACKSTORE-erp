import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Flag, X } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { FlagRefType } from '@/entities/business-day';
import type { CloseDayForm } from '../model/useCloseDayForm';

/**
 * A review row the owner can flag as suspicious with a short reason (collected for the close
 * payload). When `detail` is given, the row's main area expands/collapses to reveal it on click.
 */
export function FlaggableRow({
  refType, refId, form, children, detail,
}: {
  refType: FlagRefType;
  refId: number;
  form: CloseDayForm;
  children: React.ReactNode;
  detail?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const reason = form.reasonOf(refType, refId);
  const flagged = reason.trim() !== '';
  const [flagOpen, setFlagOpen] = useState(flagged);
  const [expanded, setExpanded] = useState(false);

  const clearFlag = () => {
    form.setFlag(refType, refId, '');
    setFlagOpen(false);
  };

  return (
    <div className={cn(
      'rounded-xl px-3 py-2.5 transition-colors',
      flagged
        ? 'bg-launch-orange/10 ring-1 ring-launch-orange/40 dark:bg-launch-orange/15'
        : 'hover:bg-studio-mist/50 dark:hover:bg-control-gray/20',
    )}>
      <div className="flex items-center gap-2">
        {detail ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left transition-opacity hover:opacity-85"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-slate/50 transition-transform duration-150', expanded && 'rotate-90')} />
            <div className="min-w-0 flex-1">{children}</div>
          </button>
        ) : (
          <div className="min-w-0 flex-1">{children}</div>
        )}
        <button
          type="button"
          onClick={() => setFlagOpen((o) => !o)}
          aria-label={t('closeDay.flag')}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all',
            flagged
              ? 'bg-launch-orange/20 text-launch-orange hover:bg-launch-orange/30'
              : 'text-slate/40 hover:bg-control-gray/60 hover:text-slate dark:text-slate/50',
          )}
        >
          <Flag className="h-3.5 w-3.5" fill={flagged ? 'currentColor' : 'none'} />
        </button>
      </div>

      {expanded && detail && <div className="mt-2.5">{detail}</div>}

      {flagOpen && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={reason}
            onChange={(e) => form.setFlag(refType, refId, e.target.value)}
            placeholder={t('closeDay.flagReason')}
            className="h-8 rounded-lg text-xs"
            autoFocus
          />
          {flagged && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFlag}
              className="h-8 w-8 shrink-0 rounded-lg p-0 text-slate hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

