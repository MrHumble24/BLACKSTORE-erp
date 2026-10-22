import { ReceiptSettingsForm } from '@/features/receipt-settings';

/** Receipt settings administration page. */
export function ReceiptSettingsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ReceiptSettingsForm />
    </div>
  );
}
