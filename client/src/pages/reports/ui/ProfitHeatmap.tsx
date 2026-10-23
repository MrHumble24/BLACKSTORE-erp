import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ProfitHeatmapBucket } from '@/entities/report';
import { CARD } from './chartPalette';
import { money } from './reportFormat';

interface ProfitHeatmapProps {
  heatmap: ProfitHeatmapBucket[];
}

/** Localised short weekday names (Sun..Sat) via Intl, matching the backend's 0..6. */
function weekdayLabels(lang: string): string[] {
  const fmt = new Intl.DateTimeFormat(lang, { weekday: 'short' });
  // 2023-01-01 is a Sunday → indices 0..6 map to Sun..Sat.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
}

/** Sales activity grid: 7 weekday rows × 24 hour columns, cell opacity scaled to sales. */
export function ProfitHeatmap({ heatmap }: ProfitHeatmapProps) {
  const { t, i18n } = useTranslation();
  const days = weekdayLabels(i18n.language || 'en');
  const max = heatmap.reduce((m, b) => Math.max(m, Number(b.sales) || 0), 0);
  const byKey = new Map(heatmap.map((b) => [`${b.weekday}-${b.hour}`, b]));

  return (
    <Card className={cn(CARD, 'flex flex-col p-5 sm:p-6')}>
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{t('reports.salesHeatmap')}</h3>
      {max === 0 ? (
        <p className="py-10 text-center text-[13px] text-steel">{t('reports.noGroupData')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[460px]">
            {days.map((day, weekday) => (
              <div key={day} className="flex items-center gap-1">
                <span className="w-9 shrink-0 text-[11px] text-steel">{day}</span>
                <div className="flex flex-1 gap-[3px]">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const bucket = byKey.get(`${weekday}-${hour}`);
                    const value = bucket ? Number(bucket.sales) || 0 : 0;
                    const alpha = value > 0 ? 0.12 + 0.88 * (value / max) : 0;
                    return (
                      <div
                        key={hour}
                        className="h-5 flex-1 rounded-[3px]"
                        style={{ backgroundColor: value > 0 ? `rgba(0,102,204,${alpha.toFixed(3)})` : '#f0f2f5' }}
                        title={`${day} ${hour}:00 — ${money(bucket?.sales ?? '0')} (${bucket?.count ?? 0})`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="mt-1 flex gap-1">
              <span className="w-9 shrink-0" />
              <div className="flex flex-1 justify-between text-[10px] text-steel">
                <span>0:00</span>
                <span>6:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
