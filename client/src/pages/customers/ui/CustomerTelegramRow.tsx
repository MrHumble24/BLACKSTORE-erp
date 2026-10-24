import { useAuthStore } from '@/entities/session';
import {
  useCustomerTelegramLink,
  useCustomerTelegramUnlink,
  type CustomerDetail,
} from '@/entities/customer';
import { TelegramInviteButton, TelegramLinkStatus } from '@/features/telegram-invite';

interface CustomerTelegramRowProps {
  customer: CustomerDetail;
  /** Re-reads the customer after the invite dialog closes or an unlink succeeds. */
  onRefresh: () => void;
}

/** Telegram link status (with Unlink when allowed) or the invite button for a customer. */
export function CustomerTelegramRow({ customer, onRefresh }: CustomerTelegramRowProps) {
  const telegramLink = useCustomerTelegramLink();
  const telegramUnlink = useCustomerTelegramUnlink();
  // Unlinking removes a link, so it follows the admin-only delete_records permission (F24).
  const canUnlink = useAuthStore((s) => s.hasPermission('delete_records'));

  if (customer.telegramLinked) {
    return (
      <TelegramLinkStatus
        id={customer.id}
        linkedAt={customer.telegramLinkedAt}
        linkedBy={customer.telegramLinkedBy}
        canUnlink={canUnlink}
        unlink={telegramUnlink}
        onDone={onRefresh}
      />
    );
  }
  return (
    <TelegramInviteButton
      name={customer.name}
      request={() => telegramLink.mutateAsync(customer.id)}
      onClose={onRefresh}
    />
  );
}
