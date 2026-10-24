import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { Sale } from '@/entities/sale';
import { TelegramInviteButton } from '@/features/telegram-invite';

interface SaleActionsProps {
  sale: Sale;
  onRefresh: () => void;
}

/** Receipt print button plus the customer's Telegram invite (only while the server minted a link). */
export function SaleActions({ sale, onRefresh }: SaleActionsProps) {
  const { t } = useTranslation();
  const { telegramInviteLink: link, customer } = sale;

  return (
    <div className="flex items-center gap-2">
      {link && customer && (
        <TelegramInviteButton
          name={customer.name}
          linked={false}
          // The sale response already carries the link; no extra request needed.
          request={() => Promise.resolve({ link, linked: false })}
          onClose={onRefresh}
        />
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(`/sales/${sale.id}/receipt`, '_blank')}
        className="gap-1.5 text-xs h-9"
      >
        <Printer className="h-4 w-4" />
        {t('sales.receiptButton')}
      </Button>
    </div>
  );
}
