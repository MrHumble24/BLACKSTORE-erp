import { useTranslation } from 'react-i18next';
import { Trash2, ShoppingCart } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Input,
  Button,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { SellCartLine } from '../model/types';
import { isBelowMinPrice } from '../lib/isBelowMinPrice';

function SellLinePriceCell({
  unitPrice,
  isBelowMin,
  onChange,
}: {
  unitPrice: string;
  isBelowMin: boolean;
  onChange: (val: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <TableCell className="px-3 py-2.5 text-right">
      <div className="flex flex-col items-end">
        <Input
          type="number"
          step="any"
          min="0"
          value={unitPrice}
          onChange={(e) => onChange(e.target.value)}
          className={`h-8 w-28 px-2.5 text-xs font-mono text-right rounded-lg border transition-colors ${
            isBelowMin
              ? 'border-launch-orange text-launch-orange bg-launch-orange/10 font-medium'
              : 'border-hairline-silver/80 bg-gallery-white text-ink focus:border-pricing-blue'
          }`}
        />
        {isBelowMin && (
          <span className="text-[10px] text-launch-orange font-medium mt-0.5 whitespace-nowrap">
            {t('sell.belowMinPrice')}
          </span>
        )}
      </div>
    </TableCell>
  );
}

interface SellLineRowProps {
  line: SellCartLine;
  index: number;
  onUpdateLinePrice: (index: number, price: string) => void;
  onUpdateWarranty: (index: number, warrantyUntil: string) => void;
  onRemoveLine: (index: number) => void;
}

function SellLineRow({
  line,
  index,
  onUpdateLinePrice,
  onUpdateWarranty,
  onRemoveLine,
}: SellLineRowProps) {
  const isDevice = line.type === 'device';
  const isBelowMin = isBelowMinPrice(line);

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/40 transition-colors">
      <TableCell className="px-3 py-2.5 font-medium text-ink whitespace-nowrap">{line.modelName}</TableCell>
      <TableCell className="px-3 py-2.5 font-mono text-xs text-slate whitespace-nowrap">{isDevice ? line.code : '—'}</TableCell>
      <TableCell className="px-3 py-2.5 text-slate text-xs whitespace-nowrap">{isDevice ? line.ownerName : '—'}</TableCell>
      <TableCell className="px-3 py-2.5 text-right font-mono text-xs text-slate whitespace-nowrap tabular-nums">
        {isDevice ? formatMoney(line.minSalePrice) : '—'}
      </TableCell>
      <SellLinePriceCell
        unitPrice={line.unitPrice}
        isBelowMin={isBelowMin}
        onChange={(val) => onUpdateLinePrice(index, val)}
      />
      <TableCell className="px-3 py-2.5 text-center font-mono text-xs whitespace-nowrap">
        {isDevice ? 1 : line.quantity}
      </TableCell>
      <TableCell className="px-3 py-2.5">
        {isDevice ? (
          <Input
            type="date"
            value={line.warrantyUntil}
            onChange={(e) => onUpdateWarranty(index, e.target.value)}
            className="h-8 w-36 px-2 text-xs rounded-lg border-hairline-silver/80"
          />
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="px-2 py-2.5 text-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveLine(index)}
          className="h-7 w-7 text-slate hover:text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

/** Touch-friendly card representation for mobile screens (< md). */
function SellLineCard({
  line,
  index,
  onUpdateLinePrice,
  onUpdateWarranty,
  onRemoveLine,
}: SellLineRowProps) {
  const { t } = useTranslation();
  const isDevice = line.type === 'device';
  const isBelowMin = isBelowMinPrice(line);

  return (
    <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white p-3.5 space-y-3 shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-ink truncate">
              {line.modelName}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-studio-mist text-slate">
              {isDevice ? t('nav.items') : t('nav.accessories')}
            </span>
          </div>
          {isDevice && (
            <div className="flex items-center gap-2 text-xs text-slate mt-1 flex-wrap font-mono">
              <span>{line.code}</span>
              <span>•</span>
              <span className="font-sans text-slate/80">{line.ownerName}</span>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveLine(index)}
          className="h-8 w-8 text-slate hover:text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-hairline-silver/40">
        <div>
          <span className="text-[11px] text-slate block mb-1">
            {t('sell.tablePrice')} ($)
          </span>
          <Input
            type="number"
            step="any"
            min="0"
            value={line.unitPrice}
            onChange={(e) => onUpdateLinePrice(index, e.target.value)}
            className={`h-9 text-xs font-mono rounded-xl border ${
              isBelowMin
                ? 'border-launch-orange text-launch-orange bg-launch-orange/10 font-medium'
                : 'border-hairline-silver/80 bg-gallery-white text-ink'
            }`}
          />
          {isBelowMin && (
            <span className="text-[10px] text-launch-orange font-medium mt-0.5 block">
              {t('sell.belowMinPrice')}
            </span>
          )}
          {isDevice && line.minSalePrice && (
            <span className="text-[10px] text-slate mt-0.5 block font-mono">
              min: {formatMoney(line.minSalePrice)}
            </span>
          )}
        </div>

        <div>
          <span className="text-[11px] text-slate block mb-1">
            {isDevice ? t('sell.tableWarranty') : t('sell.tableQty')}
          </span>
          {isDevice ? (
            <Input
              type="date"
              value={line.warrantyUntil}
              onChange={(e) => onUpdateWarranty(index, e.target.value)}
              className="h-9 px-2 text-xs rounded-xl border-hairline-silver/80"
            />
          ) : (
            <div className="h-9 flex items-center px-3 rounded-xl bg-studio-mist font-mono text-xs text-ink font-medium">
              Qty: {line.quantity}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SellLinesTableProps {
  lines: SellCartLine[];
  onUpdateLinePrice: (index: number, price: string) => void;
  onUpdateWarranty: (index: number, warrantyUntil: string) => void;
  onRemoveLine: (index: number) => void;
}

/** Responsive table and card view of items and accessories in current sale cart. */
export function SellLinesTable({
  lines,
  onUpdateLinePrice,
  onUpdateWarranty,
  onRemoveLine,
}: SellLinesTableProps) {
  const { t } = useTranslation();

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline-silver/80 p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-2 bg-gallery-white">
        <ShoppingCart className="h-8 w-8 text-slate/40 stroke-1" />
        <p className="text-xs text-slate font-medium">{t('sell.emptyLines')}</p>
        <p className="text-[11px] text-slate/60">{t('sell.scanPlaceholder')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile Card View */}
      <div className="md:hidden space-y-2.5">
        {lines.map((line, idx) => (
          <SellLineCard
            key={line.type === 'device' ? `dev-${line.itemId}` : `acc-${line.productModelId}-${idx}`}
            line={line}
            index={idx}
            onUpdateLinePrice={onUpdateLinePrice}
            onUpdateWarranty={onUpdateWarranty}
            onRemoveLine={onRemoveLine}
          />
        ))}
      </div>

      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block rounded-2xl border border-hairline-silver/70 overflow-hidden bg-gallery-white shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="bg-control-gray/30 text-[11px] border-b border-hairline-silver/60">
              <TableHead className="px-3 py-2.5 min-w-[140px]">{t('sell.tableModel')}</TableHead>
              <TableHead className="px-3 py-2.5 min-w-[120px]">{t('sell.tableCode')}</TableHead>
              <TableHead className="px-3 py-2.5 min-w-[80px]">{t('sell.tableOwner')}</TableHead>
              <TableHead className="px-3 py-2.5 min-w-[90px] text-right whitespace-nowrap">{t('sell.tableMinPrice')}</TableHead>
              <TableHead className="px-3 py-2.5 w-32 text-right whitespace-nowrap">{t('sell.tablePrice')}</TableHead>
              <TableHead className="px-3 py-2.5 w-16 text-center">{t('sell.tableQty')}</TableHead>
              <TableHead className="px-3 py-2.5 w-40">{t('sell.tableWarranty')}</TableHead>
              <TableHead className="w-10 px-2 text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, idx) => (
              <SellLineRow
                key={line.type === 'device' ? `dev-${line.itemId}` : `acc-${line.productModelId}-${idx}`}
                line={line}
                index={idx}
                onUpdateLinePrice={onUpdateLinePrice}
                onUpdateWarranty={onUpdateWarranty}
                onRemoveLine={onRemoveLine}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
