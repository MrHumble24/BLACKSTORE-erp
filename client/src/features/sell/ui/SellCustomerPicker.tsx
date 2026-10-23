import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, User, UserPlus } from 'lucide-react';
import { Input, Label, Button } from '@/shared/ui';
import { useCustomers, useCustomer, type Customer } from '@/entities/customer';

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

interface CustomerSearchSelectProps {
  selectedCustomerId: number | null;
  onSelectCustomer: (id: number | null) => void;
}

function SelectedCustomerCard({
  customerId,
  onClear,
}: {
  customerId: number;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const { data: customer } = useCustomer(customerId);

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gallery-white border border-hairline-silver/80">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-full bg-studio-mist flex items-center justify-center text-slate shrink-0">
          <User className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink truncate">
            {customer?.name ?? `Customer #${customerId}`}
          </p>
          {customer?.phone && (
            <p className="text-[11px] font-mono text-slate truncate">{customer.phone}</p>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="h-7 px-2 text-xs text-slate hover:text-ink cursor-pointer"
      >
        {t('sell.clearCustomer')}
      </Button>
    </div>
  );
}

function CustomerSearchSelect({
  selectedCustomerId,
  onSelectCustomer,
}: CustomerSearchSelectProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: customerPage, isLoading } = useCustomers(search, 1, 20);

  if (selectedCustomerId) {
    return (
      <SelectedCustomerCard
        customerId={selectedCustomerId}
        onClear={() => {
          onSelectCustomer(null);
          setSearch('');
          setIsOpen(true);
        }}
      />
    );
  }

  const customers = customerPage?.items ?? [];

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-3.5 w-3.5 text-slate pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={t('sell.searchCustomer')}
          className="pl-8 pr-3 h-9 text-xs rounded-xl bg-gallery-white border-hairline-silver/80"
        />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto rounded-xl border border-hairline-silver/80 bg-gallery-white shadow-lg p-1 space-y-0.5">
            {isLoading && (
              <div className="p-3 text-xs text-slate text-center">{t('common.loading')}</div>
            )}
            {!isLoading && customers.length === 0 && (
              <div className="p-3 text-xs text-slate text-center">{t('sell.noCustomersFound')}</div>
            )}
            {!isLoading &&
              customers.map((c: Customer) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomer(c.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-studio-mist/70 transition-colors cursor-pointer"
                >
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="font-mono text-slate text-[11px]">{c.phone}</span>
                </button>
              ))}
          </div>
        </>
      )}
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
        {isInlineNew ? t('sell.existingCustomer') : <><UserPlus className="h-3.5 w-3.5" />{t('sell.newCustomer')}</>}
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

interface SellCustomerPickerProps {
  isRequired: boolean;
  selectedCustomerId: number | null;
  onSelectCustomer: (id: number | null) => void;
  inlineCustomer: InlineCustomer | null;
  onInlineCustomerChange: (data: InlineCustomer | null) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
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
        />
      )}
      {isRequired && <DueDateField dueDate={dueDate} onChange={onDueDateChange} />}
    </div>
  );
}
