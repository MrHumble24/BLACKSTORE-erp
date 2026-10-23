import { useTranslation } from 'react-i18next';
import { DialogFooter } from './dialog';
import { Button } from './button';

interface DialogFormFooterProps {
  onClose: () => void;
  isPending: boolean;
  /** Submit button text; defaults to common.save. */
  submitLabel?: string;
  /** Red submit button for irreversible actions (e.g. restore a backup). */
  destructive?: boolean;
  /** Extra condition that keeps the submit button disabled (e.g. unmet confirmation). */
  submitDisabled?: boolean;
}

/** Standard dialog footer with outline Cancel button and Pricing Blue (or destructive) Submit button. */
export function DialogFormFooter({
  onClose,
  isPending,
  submitLabel,
  destructive = false,
  submitDisabled = false,
}: DialogFormFooterProps) {
  const { t } = useTranslation();
  return (
    <DialogFooter className="pt-4 gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isPending}
      >
        {t('common.cancel')}
      </Button>
      <Button
        type="submit"
        variant={destructive ? 'destructive' : 'default'}
        disabled={isPending || submitDisabled}
        className={
          destructive
            ? undefined
            : 'h-9 px-6 rounded-full bg-pricing-blue hover:bg-[#0077ed] text-gallery-white text-xs font-medium border-0 shadow-none'
        }
      >
        {isPending ? t('common.loading') : submitLabel ?? t('common.save')}
      </Button>
    </DialogFooter>
  );
}
