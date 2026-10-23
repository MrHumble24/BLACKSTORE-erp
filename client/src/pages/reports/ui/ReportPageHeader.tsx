import type { ReactNode } from 'react';

interface ReportPageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

/** Shared reports page header: title/subtitle plus optional actions block. */
export function ReportPageHeader({ title, subtitle, actions }: ReportPageHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <p className="text-[13px] text-slate">{subtitle}</p>
    </div>
  );
}
