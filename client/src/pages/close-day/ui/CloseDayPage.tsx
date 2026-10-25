import { useTranslation } from 'react-i18next';
import { CalendarClock, Clock, History } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@/shared/ui';
import { formatDate, formatTime } from '@/shared/lib';
import { useCurrentBusinessDay } from '@/entities/business-day';
import { ClosedDaysTable } from '@/widgets/closed-days';
import { CurrentDayTab } from './CurrentDayTab';

/** The owner's daily close: a Current tab (the open day) and a History tab (closed days). */
export function CloseDayPage() {
  const { t } = useTranslation();
  const { data } = useCurrentBusinessDay();

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-sf-pro-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              {t('closeDay.title')}
            </h1>
            {data && (
              <Badge variant="outline" className="gap-1.5 border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('closeDay.statusOpen')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate">
            {data ? (
              <>
                <Clock className="h-3.5 w-3.5 opacity-70" />
                <span>
                  {t('closeDay.openedAt', { time: `${formatDate(data.day.openedAt)} ${formatTime(data.day.openedAt)}` })}
                </span>
              </>
            ) : (
              <span>{t('closeDay.subtitle')}</span>
            )}
          </div>
        </div>
      </div>

      {/* forceMount on Current keeps the typed counts and flags alive while the owner peeks at History. */}
      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="bg-control-gray/50 p-1 dark:bg-control-gray/30">
          <TabsTrigger value="current" className="gap-2 px-4">
            <CalendarClock className="h-4 w-4" />
            {t('closeDay.tabCurrent')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 px-4">
            <History className="h-4 w-4" />
            {t('closeDay.tabHistory')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="current" forceMount className="data-[state=inactive]:hidden">
          <CurrentDayTab />
        </TabsContent>
        <TabsContent value="history">
          <ClosedDaysTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

