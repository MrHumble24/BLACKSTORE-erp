import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui';
import { PartnerFormDialog } from '@/features/manage-partners';
import { PartnerTransactionsPanel } from '@/widgets/partner-transactions';
import { CurrentPartnersTab } from './CurrentPartnersTab';

interface PartnersHeaderProps {
  onAdd: () => void;
}

function PartnersHeader({ onAdd }: PartnersHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{t('partners.title')}</h1>
        <p className="text-xs text-slate mt-0.5">{t('partners.subtitle')}</p>
      </div>
      <Button onClick={onAdd} className="gap-1.5 h-8 text-xs">
        <Plus className="h-4 w-4" />
        <span>{t('partners.addPartner')}</span>
      </Button>
    </div>
  );
}

/** Partners page: header with Add partner, then Current (partners table) and Transactions (feed) tabs. */
export function PartnersPage() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PartnersHeader onAdd={() => setDialogOpen(true)} />
      <Tabs defaultValue="current" className="space-y-6">
        <TabsList>
          <TabsTrigger value="current">{t('partners.tabCurrent')}</TabsTrigger>
          <TabsTrigger value="transactions">{t('partners.tabTransactions')}</TabsTrigger>
        </TabsList>
        <TabsContent value="current" forceMount className="data-[state=inactive]:hidden">
          <CurrentPartnersTab />
        </TabsContent>
        <TabsContent value="transactions" forceMount className="data-[state=inactive]:hidden">
          <PartnerTransactionsPanel />
        </TabsContent>
      </Tabs>
      <PartnerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
