import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pricing-blue/30 disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100 cursor-pointer shrink-0',
  {
    variants: {
      variant: {
        // Pricing Blue conversion control (Apple Style Reference)
        default:
          'bg-pricing-blue text-gallery-white hover:bg-[#0077ed] active:bg-[#0066cc] font-medium border-0 shadow-none',
        // Outlined Explore Pill: restrained hairline border, transparent/white fill, ink text
        outline:
          'border border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel font-normal transition-colors shadow-none',
        // Control Gray secondary pill
        secondary:
          'bg-control-gray text-ink hover:bg-[#dedee0] font-normal border-0 shadow-none',
        // Quiet ghost utility button
        ghost:
          'text-slate hover:text-ink hover:bg-control-gray/50 font-normal border-0 shadow-none',
        // Apple Blue text control / link
        link:
          'text-apple-blue hover:text-[#0055b3] hover:underline p-0 h-auto font-normal border-0 shadow-none',
        // Launch Orange status/destructive button
        destructive:
          'bg-launch-orange text-gallery-white hover:bg-[#9e3a00] font-normal border-0 shadow-none',
      },
      size: {
        default: 'h-9 px-5 text-xs font-medium',
        sm: 'h-7.5 px-3.5 text-xs font-normal',
        lg: 'h-10 px-6 text-sm font-medium',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/** Apple-styled pill button component with quiet, precise controls and comfortable spacing. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
