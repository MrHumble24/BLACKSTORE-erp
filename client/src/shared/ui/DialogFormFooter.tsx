import { useTranslation } from 'react-i18next';
import { DialogFooter } from './dialog';
import { Button } from './button';

interface DialogFormFooterProps {
  onClose: () => void;
  isPending: boolean;
  saveText?: string;
  cancelText?: string;
}

/** Standard dialog footer with outline Cancel button and Pricing Blue Submit button. */
export function DialogFormFooter({
  onClose,
  isPending,
  saveText,
  cancelText,
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
        {cancelText ?? t('common.cancel')}
      </Button>
      <Button
        type="submit"
        disabled={isPending}
        className="h-9 px-6 rounded-full bg-pricing-blue hover:bg-[#0077ed] text-gallery-white text-xs font-medium border-0 shadow-none"
      >
        {isPending ? t('common.loading') : (saveText ?? t('common.save'))}
      </Button>
    </DialogFooter>
  );
}
