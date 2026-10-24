import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/lib';

/** Time-of-day greeting key from the local hour. */
function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** Compact greeting row: "Good <time>, <name>" plus today's date. */
export function HomeGreeting({ name }: { name: string }) {
  const { t } = useTranslation();
  const [now] = useState(() => new Date());
  const greeting = t(`home.greeting.${greetingKey(now.getHours())}`);

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
        {t('home.hello', { greeting, name })}
      </h1>
      <p className="text-[13px] text-slate">{formatDate(now)}</p>
    </div>
  );
}
