import { Input } from './input';

interface DateRangeInputsProps {
  from?: string;
  to?: string;
  /** Receives the full updated range so the caller can merge it into its filters. */
  onChange: (range: { from?: string; to?: string }) => void;
}

/** A pair of from/to date inputs for list filters (shared across transfers, ledger, audit log). */
export function DateRangeInputs({ from, to, onChange }: DateRangeInputsProps) {
  return (
    <>
      <Input
        type="date"
        value={from ?? ''}
        onChange={(e) => onChange({ from: e.target.value || undefined, to })}
        className="w-40 h-8 text-xs rounded-full"
      />
      <Input
        type="date"
        value={to ?? ''}
        onChange={(e) => onChange({ from, to: e.target.value || undefined })}
        className="w-40 h-8 text-xs rounded-full"
      />
    </>
  );
}
