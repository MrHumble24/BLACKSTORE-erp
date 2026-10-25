import { formatMoney } from '@/shared/lib';

/** One money totals card used by the expenses and partner transactions totals rows. */
export function TotalCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-5 space-y-1">
      <p className="text-[11px] text-slate tracking-[-0.01em]">{label}</p>
      <p className={`text-xl font-semibold tracking-tight ${accent ?? 'text-ink'}`}>{formatMoney(value)}</p>
    </div>
  );
}
