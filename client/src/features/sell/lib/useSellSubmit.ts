import { useNavigate } from 'react-router-dom';
import { useSubmitWithError } from '@/shared/lib';
import { useCreateSale, type PaymentMethod, type Sale } from '@/entities/sale';
import { useCreateCustomer } from '@/entities/customer';
import type { SellCartLine } from '../model/types';
import type { InlineCustomer } from '../ui/SellCustomerPicker';
import { buildSaleLines } from './buildSaleLines';

interface UseSellSubmitParams {
  locationId: number | null;
  lines: SellCartLine[];
  paymentAmount: string;
  paymentMethod: PaymentMethod;
  customerId: number | null;
  inlineCustomer: InlineCustomer | null;
  dueDate: string;
  onCustomerCreated?: (id: number) => void;
  onSaleCreated?: (sale: Sale) => void;
}

/** Hook encapsulating validation and submission logic for a POS sale. */
export function useSellSubmit({
  locationId,
  lines,
  paymentAmount,
  paymentMethod,
  customerId,
  inlineCustomer,
  dueDate,
  onCustomerCreated,
  onSaleCreated,
}: UseSellSubmitParams) {
  const navigate = useNavigate();
  const { error, runWithCatch } = useSubmitWithError();
  const createSale = useCreateSale();
  const createCustomer = useCreateCustomer();

  const handleSave = async () => {
    if (!locationId || lines.length === 0) return;

    await runWithCatch(async () => {
      let finalCustomerId = customerId;
      if (!finalCustomerId && inlineCustomer?.name && inlineCustomer?.phone) {
        const created = await createCustomer.mutateAsync({
          name: inlineCustomer.name.trim(),
          phone: inlineCustomer.phone.trim(),
        });
        finalCustomerId = created.id;
        onCustomerCreated?.(created.id);
      }

      const numPaid = Number(paymentAmount) || 0;
      const sale = await createSale.mutateAsync({
        locationId,
        lines: buildSaleLines(lines),
        customerId: finalCustomerId ?? undefined,
        dueDate: dueDate || undefined,
        payment: numPaid > 0 ? { amount: paymentAmount, method: paymentMethod } : undefined,
      });

      if (onSaleCreated) {
        onSaleCreated(sale);
      } else {
        navigate(`/sales/${sale.id}`);
      }
    });
  };

  return {
    handleSave,
    isPending: createSale.isPending || createCustomer.isPending,
    error,
  };
}
