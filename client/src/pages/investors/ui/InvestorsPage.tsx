import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useInvestors } from '@/entities/investor';
import { InvestorFormDialog } from '@/features/manage-investors';
import { InvestorsTable } from './InvestorsTable';

/**
 * Master data page for investors (money put in / paid out), gated by manage_investors.
 */
export function InvestorsPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const { data: investors = [], isLoading } = useInvestors(true);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {t('investors.title')}
          </h1>
          <p className="text-xs text-slate">{t('investors.subtitle')}</p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="gap-2 bg-pricing-blue hover:bg-pricing-blue/90 text-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('investors.addInvestor')}</span>
        </Button>
      </div>

      <InvestorsTable investors={investors} isLoading={isLoading} />

      <InvestorFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
