import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, TableEmptyRow,
} from '@/shared/ui';
import { ATTRIBUTE_TYPE_LABELS, type Category, type CategoryAttribute } from '@/entities/category';

/** Single attribute row: key, label, type, options, requirement, order and edit action. */
function AttributeRow({
  attribute,
  controlsEnabled,
  onEdit,
}: {
  attribute: CategoryAttribute;
  controlsEnabled: boolean;
  onEdit: (a: CategoryAttribute) => void;
}) {
  const { t } = useTranslation();

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="font-mono text-xs text-ink">{attribute.key}</TableCell>
      <TableCell className="font-medium text-ink">{attribute.label}</TableCell>
      <TableCell className="text-xs text-slate">{t(ATTRIBUTE_TYPE_LABELS[attribute.type])}</TableCell>
      <TableCell className="text-xs text-slate">
        {(attribute.options ?? []).join(', ') || '—'}
      </TableCell>
      <TableCell className="text-xs text-slate">
        {attribute.required ? t('categories.requiredYes') : '—'}
      </TableCell>
      <TableCell className="text-xs text-slate">{attribute.sortOrder}</TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(attribute)}
          disabled={!controlsEnabled}
          className="h-7.5 px-3 rounded-full border-hairline-silver bg-gallery-white text-apple-blue hover:bg-studio-mist hover:border-apple-blue/50 text-xs font-medium gap-1.5"
        >
          <Pencil className="h-3 w-3 text-apple-blue" />
          <span>{t('common.edit')}</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface AttributesTableProps {
  category: Category;
  onEdit: (attribute: CategoryAttribute) => void;
  onAdd: () => void;
}

/** The attributes grid (header row, empty state and rows). */
function AttributesGrid({ category, controlsEnabled, onEdit }: {
  category: Category;
  controlsEnabled: boolean;
  onEdit: (a: CategoryAttribute) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('categories.key')}</TableHead>
            <TableHead>{t('categories.label')}</TableHead>
            <TableHead>{t('categories.attributeType')}</TableHead>
            <TableHead>{t('categories.options')}</TableHead>
            <TableHead>{t('categories.requiredLabel')}</TableHead>
            <TableHead>{t('categories.order')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {category.attributes.length === 0 && (
            <TableEmptyRow colSpan={7} message={t('categories.noAttributes')} />
          )}
          {category.attributes.map((attribute) => (
            <AttributeRow
              key={attribute.id}
              attribute={attribute}
              controlsEnabled={controlsEnabled}
              onEdit={onEdit}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Attributes of one category with an add action (guarded while inactive). */
export function AttributesTable({ category, onEdit, onAdd }: AttributesTableProps) {
  const { t } = useTranslation();
  const controlsEnabled = category.isActive;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-sf-pro-display text-ink tracking-tight">
          {t('categories.attributesTitle')}
        </h2>
        <Button
          onClick={onAdd}
          disabled={!controlsEnabled}
          className="gap-2 bg-pricing-blue hover:bg-pricing-blue/90 text-white rounded-full text-xs font-medium px-5 h-9 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('categories.addAttribute')}</span>
        </Button>
      </div>

      <AttributesGrid category={category} controlsEnabled={controlsEnabled} onEdit={onEdit} />
    </div>
  );
}
