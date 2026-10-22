import * as React from 'react';
import { cn } from '../lib/utils';

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  /** Called with the new boolean value on toggle. */
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Apple-styled on/off switch built on a button (no extra Radix dependency needed).
 * Use with react-hook-form watch/setValue for boolean fields.
 */
export function Switch({ checked, onCheckedChange, disabled, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-pricing-blue' : 'bg-control-gray',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-gallery-white shadow-sm transition-transform duration-150',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
