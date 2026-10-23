import { TableHead } from '@/shared/ui';
import { cn } from '@/shared/lib';

interface ReportHeadCellProps {
  label: string;
  className?: string;
}

/** Quiet table column header used by all report tables (normal-case steel label). */
export function ReportHeadCell({ label, className }: ReportHeadCellProps) {
  return (
    <TableHead className={cn('normal-case text-[11px] font-medium tracking-[-0.005em] text-steel', className)}>
      {label}
    </TableHead>
  );
}
