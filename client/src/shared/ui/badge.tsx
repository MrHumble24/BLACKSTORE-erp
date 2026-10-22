import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-normal tracking-[-0.01em] transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-ink text-gallery-white border-0',
        secondary:
          'bg-control-gray text-ink border-0',
        destructive:
          'border border-launch-orange/20 bg-launch-orange/10 text-launch-orange font-medium',
        outline:
          'border border-hairline-silver bg-gallery-white text-ink',
        active:
          'border border-hairline-silver bg-gallery-white text-ink font-normal',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/** Apple-styled badge pill with subtle, restrained contrast from the Apple palette. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
