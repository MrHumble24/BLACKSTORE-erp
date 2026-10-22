import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Badge, TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import {
  useProductModels,
  ProductModelActiveToggle,
  type ProductModel,
} from '@/entities/product-model';

interface CategoryModelsTableProps {
  categoryId: number;
  onAdd: () => void;
  onEdit: (productModel: ProductModel) => void;
}

/** Single row of the models table. */
function ModelRow({ model, onEdit }: { model: ProductModel; onEdit: (m: ProductModel) => void }) {
  const { t } = useTranslation();

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="font-medium text-ink">{model.name}</TableCell>
      <TableCell>
        <Badge variant={model.isActive ? 'active' : 'destructive'} className="px-2.5 py-0.5 text-[11px]">
          {model.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(model)}
            className="h-7.5 px-3 rounded-full border-hairline-silver bg-gallery-white text-apple-blue hover:bg-studio-mist hover:border-apple-blue/50 text-xs font-medium gap-1.5"
          >
            <Pencil className="h-3 w-3 text-apple-blue" />
            <span>{t('common.edit')}</span>
          </Button>
          <ProductModelActiveToggle productModel={model} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/** The models grid (loading, empty and rows) pulled out of the section header block. */
function ModelsGrid({ models, isLoading, onEdit }: {
  models: ProductModel[];
  isLoading: boolean;
  onEdit: (productModel: ProductModel) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('productModels.name')}</TableHead>
            <TableHead>{t('categories.status')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={3} />}
          {!isLoading && models.length === 0 && (
            <TableEmptyRow colSpan={3} message={t('categories.noModels')} />
          )}
          {!isLoading && models.map((model) => (
            <ModelRow key={model.id} model={model} onEdit={onEdit} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Product models belonging to one category, with active toggles. */
export function CategoryModelsTable({ categoryId, onAdd, onEdit }: CategoryModelsTableProps) {
  const { t } = useTranslation();
  const { data: models = [], isLoading } = useProductModels(categoryId, true);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-sf-pro-display text-ink tracking-tight">
          {t('categories.modelsTitle')}
        </h2>
        <Button
          onClick={onAdd}
          className="gap-2 bg-pricing-blue hover:bg-[#0077ed] text-gallery-white rounded-full text-xs font-medium px-5 h-9 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('categories.addModel')}</span>
        </Button>
      </div>

      <ModelsGrid models={models} isLoading={isLoading} onEdit={onEdit} />
    </div>
  );
}
