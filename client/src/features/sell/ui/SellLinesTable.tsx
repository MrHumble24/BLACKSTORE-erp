import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
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
    <TableCell>
      <Input
        type="number"
        step="any"
        min="0"
        value={unitPrice}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 text-xs font-mono ${
          isBelowMin ? 'border-launch-orange text-launch-orange bg-launch-orange/10' : ''
        }`}
      />
      {isBelowMin && (
        <span className="text-[10px] text-launch-orange block mt-0.5">
          {t('sell.belowMinPrice')}
        </span>
      )}
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
    <TableRow>
      <TableCell className="font-medium text-ink">{line.modelName}</TableCell>
      <TableCell className="font-mono text-xs text-slate">{isDevice ? line.code : '—'}</TableCell>
      <TableCell className="text-slate text-xs">{isDevice ? line.ownerName : '—'}</TableCell>
      <TableCell className="text-slate text-xs">{isDevice ? formatMoney(line.minSalePrice) : '—'}</TableCell>
      <SellLinePriceCell
        unitPrice={line.unitPrice}
        isBelowMin={isBelowMin}
        onChange={(val) => onUpdateLinePrice(index, val)}
      />
      <TableCell className="text-center font-mono text-xs">{isDevice ? 1 : line.quantity}</TableCell>
      <TableCell>
        {isDevice ? (
          <Input
            type="date"
            value={line.warrantyUntil}
            onChange={(e) => onUpdateWarranty(index, e.target.value)}
            className="h-8 text-xs"
          />
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveLine(index)}
          className="h-7 w-7 text-slate hover:text-launch-orange hover:bg-transparent"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface SellLinesTableProps {
  lines: SellCartLine[];
  onUpdateLinePrice: (index: number, price: string) => void;
  onUpdateWarranty: (index: number, warrantyUntil: string) => void;
  onRemoveLine: (index: number) => void;
}

/** Table of items and accessories in current sale cart. */
export function SellLinesTable({
  lines,
  onUpdateLinePrice,
  onUpdateWarranty,
  onRemoveLine,
}: SellLinesTableProps) {
  const { t } = useTranslation();

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline-silver p-8 text-center text-xs text-slate">
        {t('sell.emptyLines')}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline-silver/70 overflow-hidden bg-gallery-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-control-gray/30 text-[11px]">
            <TableHead>{t('sell.tableModel')}</TableHead>
            <TableHead>{t('sell.tableCode')}</TableHead>
            <TableHead>{t('sell.tableOwner')}</TableHead>
            <TableHead>{t('sell.tableMinPrice')}</TableHead>
            <TableHead className="w-32">{t('sell.tablePrice')}</TableHead>
            <TableHead className="w-16">{t('sell.tableQty')}</TableHead>
            <TableHead className="w-40">{t('sell.tableWarranty')}</TableHead>
            <TableHead className="w-12" />
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
  );
}
