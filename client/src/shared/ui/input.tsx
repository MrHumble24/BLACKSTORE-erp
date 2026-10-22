import * as React from 'react';
import { cn } from '../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Apple-styled input control: rounded-full (980px radius), hairline outline, gallery-white fill.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[980px] border border-hairline-silver bg-gallery-white px-4 py-2 text-sm text-ink tracking-[-0.016em] transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-steel focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-control-gray disabled:opacity-60',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
