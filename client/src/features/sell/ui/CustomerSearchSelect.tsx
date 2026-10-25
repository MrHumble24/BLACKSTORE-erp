import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, User, Handshake } from 'lucide-react';
import { Input, Button } from '@/shared/ui';
import { useCustomers, useCustomer, type Customer } from '@/entities/customer';
import { useAuthStore } from '@/entities/session';

/** Handover link that carries the cart's device ids, so they need not be scanned again. */
function consignmentHref(deviceItemIds: number[]) {
  return deviceItemIds.length > 0 ? `/consignments/new?items=${deviceItemIds.join(',')}` : '/consignments/new';
}

interface SelectedCustomerCardProps {
  customerId: number;
  onClear: () => void;
}

function SelectedCustomerCard({ customerId, onClear }: SelectedCustomerCardProps) {
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

interface SearchResultsProps {
  isLoading: boolean;
  customers: Customer[];
  canConsign: boolean;
  deviceItemIds: number[];
  onSelect: (id: number) => void;
}

function SearchResults({ isLoading, customers, canConsign, deviceItemIds, onSelect }: SearchResultsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="p-3 text-xs text-slate text-center">{t('common.loading')}</div>;
  }

  if (customers.length === 0) {
    return (
      <div className="p-3 text-xs text-slate text-center space-y-1.5">
        <p>{t('sell.noCustomersFound')}</p>
        {canConsign && (
          <Link
            to={consignmentHref(deviceItemIds)}
            className="inline-flex items-center gap-1 text-apple-blue hover:underline font-medium text-[11px]"
          >
            <Handshake className="h-3 w-3 shrink-0" />
            <span>{t('sell.partnerPrompt')}</span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      {customers.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-studio-mist/70 transition-colors cursor-pointer"
        >
          <span className="font-medium text-ink">{c.name}</span>
          <span className="font-mono text-slate text-[11px]">{c.phone}</span>
        </button>
      ))}
    </>
  );
}

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  customers: Customer[];
  canConsign: boolean;
  deviceItemIds: number[];
  onSelect: (id: number) => void;
}

function SearchDropdown({
  isOpen,
  onClose,
  isLoading,
  customers,
  canConsign,
  deviceItemIds,
  onSelect,
}: SearchDropdownProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto rounded-xl border border-hairline-silver/80 bg-gallery-white shadow-lg p-1 space-y-0.5">
        <SearchResults
          isLoading={isLoading}
          customers={customers}
          canConsign={canConsign}
          deviceItemIds={deviceItemIds}
          onSelect={onSelect}
        />
      </div>
    </>
  );
}

interface SearchInputRowProps {
  value: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  placeholder: string;
}

function SearchInputRow({ value, onChange, onFocus, placeholder }: SearchInputRowProps) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3 h-3.5 w-3.5 text-slate pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="pl-8 pr-3 h-9 text-xs rounded-xl bg-gallery-white border-hairline-silver/80"
      />
    </div>
  );
}

export interface CustomerSearchSelectProps {
  selectedCustomerId: number | null;
  onSelectCustomer: (id: number | null) => void;
  deviceItemIds: number[];
}

/** Dropdown customer search selector with zero-result partner redirection. */
export function CustomerSearchSelect({
  selectedCustomerId,
  onSelectCustomer,
  deviceItemIds,
}: CustomerSearchSelectProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const canConsign = useAuthStore((s) => s.hasPermission('consign'));
  const { data: customerPage, isLoading } = useCustomers(search, 1, 20);

  if (selectedCustomerId) {
    const handleClear = () => {
      onSelectCustomer(null);
      setSearch('');
      setIsOpen(true);
    };
    return <SelectedCustomerCard customerId={selectedCustomerId} onClear={handleClear} />;
  }

  return (
    <div className="relative">
      <SearchInputRow
        value={search}
        onChange={(v) => {
          setSearch(v);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={t('sell.searchCustomer')}
      />
      <SearchDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        isLoading={isLoading}
        customers={customerPage?.items ?? []}
        canConsign={canConsign}
        deviceItemIds={deviceItemIds}
        onSelect={(id) => {
          onSelectCustomer(id);
          setIsOpen(false);
        }}
      />
    </div>
  );
}

/** Subtle callout directing partner shop consignment handovers to /consignments/new. */
export function ConsignmentHint({ deviceItemIds }: { deviceItemIds: number[] }) {
  const { t } = useTranslation();
  const canConsign = useAuthStore((s) => s.hasPermission('consign'));
  if (!canConsign) return null;

  return (
    <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-studio-mist/60 border border-hairline-silver/60 text-slate">
      <span className="flex items-center gap-1.5 min-w-0 truncate">
        <Handshake className="h-3.5 w-3.5 text-apple-blue shrink-0" />
        <span className="truncate">{t('sell.consignmentHint')}</span>
      </span>
      <Link
        to={consignmentHref(deviceItemIds)}
        className="text-apple-blue hover:underline font-medium shrink-0 ml-2"
      >
        {t('sell.consignmentLink')}
      </Link>
    </div>
  );
}
