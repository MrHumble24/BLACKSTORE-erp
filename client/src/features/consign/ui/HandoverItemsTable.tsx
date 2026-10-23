import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Button,
} from '@/shared/ui';
import type { Item } from '@/entities/item';

export interface HandoverLine {
  item: Item;
  minPrice: string;
}

interface HandoverItemsTableProps {
  lines: HandoverLine[];
  onUpdateMinPrice: (index: number, minPrice: string) => void;
  onRemoveLine: (index: number) => void;
}

interface HandoverTableRowProps {
  line: HandoverLine;
  index: number;
  onUpdateMinPrice: (index: number, minPrice: string) => void;
  onRemoveLine: (index: number) => void;
}

function HandoverTableRow({
  line,
  index,
  onUpdateMinPrice,
  onRemoveLine,
}: HandoverTableRowProps) {
  const code = line.item.identifiers[0]?.value ?? String(line.item.id);

  return (
    <TableRow className="text-xs">
      <TableCell className="font-mono text-slate">{index + 1}</TableCell>
      <TableCell className="font-medium text-ink">{line.item.productModel.name}</TableCell>
      <TableCell className="font-mono text-slate">{code}</TableCell>
      <TableCell className="text-slate">{line.item.investor.name}</TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          step="any"
          min="0.01"
          value={line.minPrice}
          onChange={(e) => onUpdateMinPrice(index, e.target.value)}
          placeholder="0.00"
          className="h-7 text-xs font-mono text-right"
          required
        />
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemoveLine(index)}
          className="h-7 w-7 p-0 text-slate hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

/** Table rendering scanned items queued for consignment handover. */
export function HandoverItemsTable({
  lines,
  onUpdateMinPrice,
  onRemoveLine,
}: HandoverItemsTableProps) {
  const { t } = useTranslation();

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-hairline-silver/70 p-8 text-center text-xs text-slate bg-gallery-white">
        {t('consign.noItemsAdded')}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline-silver/70 overflow-hidden bg-gallery-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-control-gray/30 text-[11px]">
            <TableHead className="w-12">#</TableHead>
            <TableHead>{t('items.model')}</TableHead>
            <TableHead>{t('items.identifiers')}</TableHead>
            <TableHead>{t('reports.investor')}</TableHead>
            <TableHead className="w-40 text-right">{t('consign.minPrice')}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, idx) => (
            <HandoverTableRow
              key={line.item.id}
              line={line}
              index={idx}
              onUpdateMinPrice={onUpdateMinPrice}
              onRemoveLine={onRemoveLine}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
