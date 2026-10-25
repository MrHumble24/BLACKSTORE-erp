import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, UserPlus } from 'lucide-react';
import { Input, Label, Button } from '@/shared/ui';
import { CustomerSearchSelect, ConsignmentHint } from './CustomerSearchSelect';

export interface InlineCustomer {
  name: string;
  phone: string;
}

interface InlineCustomerFieldsProps {
  inlineCustomer: InlineCustomer | null;
  onInlineCustomerChange: (data: InlineCustomer | null) => void;
  isRequired: boolean;
}

function InlineCustomerFields({
  inlineCustomer,
  onInlineCustomerChange,
  isRequired,
}: InlineCustomerFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Input
        value={inlineCustomer?.name ?? ''}
        onChange={(e) =>
          onInlineCustomerChange({
            name: e.target.value,
            phone: inlineCustomer?.phone ?? '',
          })
        }
        placeholder={t('sell.customerName')}
        className="h-9 text-xs"
        required={isRequired}
      />
      <Input
        value={inlineCustomer?.phone ?? ''}
        onChange={(e) =>
          onInlineCustomerChange({
            name: inlineCustomer?.name ?? '',
            phone: e.target.value,
          })
        }
        placeholder={t('common.phonePlaceholder')}
        className="h-9 text-xs"
        required={isRequired}
      />
    </div>
  );
}

function CustomerPickerHeader({
  isInlineNew,
  isRequired,
  onToggle,
}: {
  isInlineNew: boolean;
  isRequired: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs font-semibold text-ink flex items-center gap-1.5">
        <User className="h-3.5 w-3.5" />
        {t('sell.customer')} {isRequired && <span className="text-launch-orange">*</span>}
      </Label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="text-xs h-7 text-apple-blue hover:text-apple-blue gap-1"
      >
        {isInlineNew ? (
          t('sell.existingCustomer')
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5" />
            {t('sell.newCustomer')}
          </>
        )}
      </Button>
    </div>
  );
}

function DueDateField({ dueDate, onChange }: { dueDate: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="pt-2 border-t border-hairline-silver/40">
      <Label htmlFor="sale-due-date" className="text-xs text-slate">
        {t('sell.dueDate')}
      </Label>
      <Input
        id="sale-due-date"
        type="date"
        value={dueDate}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-xs mt-1"
      />
    </div>
  );
}

export interface SellCustomerPickerProps {
  isRequired: boolean;
  selectedCustomerId: number | null;
  onSelectCustomer: (id: number | null) => void;
  inlineCustomer: InlineCustomer | null;
  onInlineCustomerChange: (data: InlineCustomer | null) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
  deviceItemIds: number[];
}

/** Customer selection for sales: either pick existing from search or fill inline. */
export function SellCustomerPicker({
  isRequired,
  selectedCustomerId,
  onSelectCustomer,
  inlineCustomer,
  onInlineCustomerChange,
  dueDate,
  onDueDateChange,
  deviceItemIds,
}: SellCustomerPickerProps) {
  const [isInlineNew, setIsInlineNew] = useState(false);

  const toggleMode = () => {
    const nextMode = !isInlineNew;
    setIsInlineNew(nextMode);
    if (nextMode) {
      onSelectCustomer(null);
      onInlineCustomerChange({ name: '', phone: '' });
    } else {
      onInlineCustomerChange(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl bg-control-gray/30 p-4 border border-hairline-silver/60">
      <CustomerPickerHeader
        isInlineNew={isInlineNew}
        isRequired={isRequired}
        onToggle={toggleMode}
      />
      {isInlineNew ? (
        <InlineCustomerFields
          inlineCustomer={inlineCustomer}
          onInlineCustomerChange={onInlineCustomerChange}
          isRequired={isRequired}
        />
      ) : (
        <CustomerSearchSelect
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={onSelectCustomer}
          deviceItemIds={deviceItemIds}
        />
      )}
      <ConsignmentHint deviceItemIds={deviceItemIds} />
      {isRequired && <DueDateField dueDate={dueDate} onChange={onDueDateChange} />}
    </div>
  );
}
