import { useTranslation } from 'react-i18next';
import { Activity, Inbox } from 'lucide-react';
import { Badge, Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { DayEvent } from '@/entities/business-day';
import type { CloseDayForm } from '../model/useCloseDayForm';
import { CARD, EVENT_GRID } from './constants';
import { DayEventRow } from './DayEventRow';

/** Every event of the open day, newest first (server order), in one compact table-like card. */
export function DayEventsSection({ events, form }: { events: DayEvent[]; form: CloseDayForm }) {
  const { t } = useTranslation();
  return (
    <Card className={cn(CARD, 'flex flex-col p-6')}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-apple-blue/10 text-apple-blue dark:bg-apple-blue/20">
            <Activity className="h-4 w-4" />
          </div>
          <h3 className="font-sf-pro-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {t('closeDay.events')}
          </h3>
        </div>
        <Badge variant="outline" className="border-hairline-silver/60 bg-control-gray/40 text-[11px] font-medium tabular-nums text-slate">
          {t('closeDay.eventsCount', { n: events.length })}
        </Badge>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-hairline-silver/60 bg-studio-mist/60 text-slate/60 dark:bg-control-gray/30">
            <Inbox className="h-6 w-6" />
          </div>
          <p className="font-sf-pro-display text-sm font-semibold text-ink">{t('closeDay.noEvents')}</p>
          <p className="mt-1 max-w-sm text-xs text-slate">{t('closeDay.eventsEmptySubtitle')}</p>
        </div>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <div className="min-w-[760px] px-2">
            <div className="flex items-center gap-2 border-b border-hairline-silver/40 px-3 pb-2.5 text-[11px] font-medium text-slate">
              <div className={cn(EVENT_GRID, 'min-w-0 flex-1')}>
                <span>{t('closeDay.time')}</span>
                <span>{t('closeDay.type')}</span>
                <span>{t('closeDay.details')}</span>
                <span>{t('closeDay.who')}</span>
                <span className="text-right">{t('common.total')}</span>
                <span className="text-right">{t('closeDay.drawer')}</span>
              </div>
              <span className="w-[28px] shrink-0" />
            </div>
            <div className="max-h-[30rem] divide-y divide-hairline-silver/30 overflow-y-auto pt-1">
              {events.map((e) => <DayEventRow key={e.id} event={e} form={form} />)}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

