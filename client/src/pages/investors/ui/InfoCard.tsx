import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib';

/** Small labelled stat card used by the investor detail rows. */
export function InfoCard({ label, value, valueClassName = 'text-ink' }: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] text-slate tracking-[-0.01em]">{label}</p>
      <p className={cn('mt-1 text-lg font-semibold font-sf-pro-display tracking-tight', valueClassName)}>
        {value}
      </p>
    </Card>
  );
}
