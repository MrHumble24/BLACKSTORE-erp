import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormError,
} from '@/shared/ui';
import { useSubmitWithError } from '@/shared/lib';
import { useReturnConsignmentItem } from '@/entities/consignment';

interface ReturnItemButtonProps {
  consignmentId: number;
  itemId: number;
}

interface ReturnConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
}

function ReturnConfirmDialog({
  open,
  onOpenChange,
  isPending,
  error,
  onConfirm,
}: ReturnConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('consign.returnConfirmTitle')}</DialogTitle>
          <DialogDescription className="text-xs text-slate pt-2">
            {t('consign.returnConfirmDescription')}
          </DialogDescription>
        </DialogHeader>
        {error && <FormError message={error} />}
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? t('common.submitting') : t('consign.confirmReturn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Action button with confirmation dialog to return an item from partner back to in stock. */
export function ReturnItemButton({ consignmentId, itemId }: ReturnItemButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const returnMutation = useReturnConsignmentItem();
  const { error, runWithCatch } = useSubmitWithError();

  const handleConfirm = () =>
    runWithCatch(async () => {
      await returnMutation.mutateAsync({ consignmentId, itemId });
      toast.success(t('consign.returnSuccess'));
      setOpen(false);
    });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 text-xs gap-1 border-hairline-silver"
      >
        <Undo2 className="h-3.5 w-3.5 text-slate" />
        {t('consign.returnItem')}
      </Button>
      <ReturnConfirmDialog
        open={open}
        onOpenChange={setOpen}
        isPending={returnMutation.isPending}
        error={error}
        onConfirm={handleConfirm}
      />
    </>
  );
}
