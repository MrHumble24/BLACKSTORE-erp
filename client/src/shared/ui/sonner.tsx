import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Apple-styled toast notifications container with pill styling and backdrop blur. */
export const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-gallery-white/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-ink group-[.toaster]:border-hairline-silver/80 group-[.toaster]:rounded-full group-[.toaster]:shadow-none group-[.toaster]:px-5 group-[.toaster]:py-3 group-[.toaster]:text-xs group-[.toaster]:tracking-[-0.01em]',
          description: 'group-[.toast]:text-slate',
          actionButton:
            'group-[.toast]:bg-pricing-blue group-[.toast]:text-gallery-white group-[.toast]:rounded-full',
          cancelButton:
            'group-[.toast]:bg-control-gray group-[.toast]:text-ink group-[.toast]:rounded-full',
        },
      }}
      {...props}
    />
  );
};
