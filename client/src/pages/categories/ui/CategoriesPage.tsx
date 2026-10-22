import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useCategories, type Category } from '@/entities/category';
import { CategoryFormDialog } from '@/features/manage-categories';
import { CategoriesTable } from './CategoriesTable';

/**
 * Master data list of categories; clicking a row opens its attributes and product models.
 */
export function CategoriesPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useCategories(true);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {t('categories.title')}
          </h1>
          <p className="text-xs text-slate">{t('categories.subtitle')}</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="gap-2 bg-pricing-blue hover:bg-[#0077ed] text-gallery-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('categories.addCategory')}</span>
        </Button>
      </div>

      <CategoriesTable
        categories={categories}
        isLoading={isLoading}
        onEdit={(c) => {
          setEditing(c);
          setOpen(true);
        }}
      />

      <CategoryFormDialog open={open} onOpenChange={setOpen} category={editing} />
    </div>
  );
}
