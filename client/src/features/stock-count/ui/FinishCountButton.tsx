import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useFinishStockCount } from '@/entities/stock-count';

/** "Finish count" button with a confirm step; once finished the count becomes read-only. */
export function FinishCountButton({ countId }: { countId: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutate: finish, isPending } = useFinishStockCount(countId);

  const confirm = () => {
    finish(undefined, {
      onSuccess: () => {
        toast.success(t('stockCount.finishedSuccess'));
        setOpen(false);
      },
      onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 px-4 rounded-full text-xs"
      >
        {t('stockCount.finishCount')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px] p-7">
          <DialogHeader>
            <DialogTitle>{t('stockCount.finishCount')}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate pt-1">{t('stockCount.finishConfirm')}</p>
          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={confirm}
              disabled={isPending}
              className="h-9 px-6 rounded-full bg-pricing-blue hover:bg-[#0077ed] text-gallery-white text-xs font-medium border-0"
            >
              {isPending ? t('common.loading') : t('stockCount.finishCount')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
