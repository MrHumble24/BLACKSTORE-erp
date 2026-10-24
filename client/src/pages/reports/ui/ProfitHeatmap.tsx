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

interface LegendProps {
  max: number;
}

function HeatmapLegend({ max }: LegendProps) {
  if (max <= 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-steel">
      <span>0</span>
      <div className="flex items-center gap-[3px]">
        <span className="h-2.5 w-2.5 rounded-[2px] bg-control-gray/60 dark:bg-[#25272e]" />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: 'color-mix(in srgb, var(--pricing-blue) 35%, var(--control-gray))' }}
        />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: 'color-mix(in srgb, var(--pricing-blue) 70%, var(--control-gray))' }}
        />
        <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--pricing-blue)' }} />
      </div>
      <span>max</span>
    </div>
  );
}

interface CellProps {
  day: string;
  hour: number;
  bucket?: ProfitHeatmapBucket;
  max: number;
}

function HeatmapCell({ day, hour, bucket, max }: CellProps) {
  const value = bucket ? Number(bucket.sales) || 0 : 0;
  const alpha = value > 0 ? 0.2 + 0.8 * (value / max) : 0;
  return (
    <div
      className={cn(
        'h-5 flex-1 rounded-[3px] transition-all duration-150',
        value > 0
          ? 'hover:brightness-110 hover:scale-105'
          : 'bg-control-gray/60 dark:bg-[#25272e] hover:bg-control-gray dark:hover:bg-[#2d3039]'
      )}
      style={
        value > 0
          ? {
              backgroundColor: `color-mix(in srgb, var(--pricing-blue) ${(alpha * 100).toFixed(1)}%, var(--control-gray))`,
            }
          : undefined
      }
      title={`${day} ${hour}:00 — ${money(bucket?.sales ?? '0')} (${bucket?.count ?? 0})`}
    />
  );
}

/** Sales activity grid: 7 weekday rows × 24 hour columns, cell opacity scaled to sales. */
export function ProfitHeatmap({ heatmap }: ProfitHeatmapProps) {
  const { t, i18n } = useTranslation();
  const days = weekdayLabels(i18n.language || 'en');
  const max = heatmap.reduce((m, b) => Math.max(m, Number(b.sales) || 0), 0);
  const byKey = new Map(heatmap.map((b) => [`${b.weekday}-${b.hour}`, b]));

  return (
    <Card className={cn(CARD, 'flex flex-col p-5 sm:p-6')}>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{t('reports.salesHeatmap')}</h3>
        <HeatmapLegend max={max} />
      </div>

      {max === 0 ? (
        <p className="py-10 text-center text-[13px] text-steel">{t('reports.noGroupData')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[460px]">
            {days.map((day, weekday) => (
              <div key={day} className="flex items-center gap-1 py-[1.5px]">
                <span className="w-9 shrink-0 text-[11px] text-steel">{day}</span>
                <div className="flex flex-1 gap-[3px]">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <HeatmapCell
                      key={hour}
                      day={day}
                      hour={hour}
                      bucket={byKey.get(`${weekday}-${hour}`)}
                      max={max}
                    />
                  ))}
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

