import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Badge, TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import { CategoryActiveToggle, type Category } from '@/entities/category';

interface CategoriesTableProps {
  categories: Category[];
  isLoading: boolean;
  onEdit: (category: Category) => void;
}

/** Single row of the categories list; the name links to the category detail page. */
function CategoryRow({ category, onEdit }: { category: Category; onEdit: (c: Category) => void }) {
  const { t } = useTranslation();

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell>
        <Link
          to={`/categories/${category.id}`}
          className="font-medium text-apple-blue underline-offset-4 hover:underline"
        >
          {category.name}
        </Link>
      </TableCell>
      <TableCell className="text-xs text-slate">
        {category.isSerialized ? t('categories.serialized') : t('categories.notSerialized')}
      </TableCell>
      <TableCell>
        <Badge variant={category.isActive ? 'active' : 'destructive'} className="px-2.5 py-0.5 text-[11px]">
          {category.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(category)}
            className="h-7.5 px-3 rounded-full border-hairline-silver bg-gallery-white text-apple-blue hover:bg-studio-mist hover:border-apple-blue/50 text-xs font-medium gap-1.5"
          >
            <Pencil className="h-3 w-3 text-apple-blue" />
            <span>{t('common.edit')}</span>
          </Button>
          <CategoryActiveToggle category={category} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Apple-styled categories table; rows open the attribute/model detail page. */
export function CategoriesTable({ categories, isLoading, onEdit }: CategoriesTableProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('categories.name')}</TableHead>
            <TableHead>{t('categories.isSerialized')}</TableHead>
            <TableHead>{t('categories.status')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={4} />}
          {!isLoading && categories.length === 0 && (
            <TableEmptyRow colSpan={4} message={t('categories.noCategories')} />
          )}
          {!isLoading && categories.map((category) => (
            <CategoryRow key={category.id} category={category} onEdit={onEdit} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
