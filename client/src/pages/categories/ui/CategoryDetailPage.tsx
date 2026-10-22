import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Badge, Button, BackLink } from '@/shared/ui';
import {
  useCategories,
  type Category,
  type CategoryAttribute,
} from '@/entities/category';
import type { ProductModel } from '@/entities/product-model';
import { CategoryFormDialog, AttributeFormDialog } from '@/features/manage-categories';
import { ProductModelFormDialog } from '@/features/manage-product-models';
import { AttributesTable } from './AttributesTable';
import { CategoryModelsTable } from './CategoryModelsTable';

/** Back link, title with status badge and the edit-category action. */
function CategoryDetailHeader({ category, onEdit }: { category: Category; onEdit: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <BackLink to="/categories" label={t('categories.backToList')} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {category.name}
          </h1>
          <Badge variant={category.isActive ? 'active' : 'destructive'} className="px-2.5 py-0.5 text-[11px]">
            {category.isActive ? t('common.active') : t('common.inactive')}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-8 px-4 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal gap-1.5"
        >
          <Pencil className="h-3 w-3 text-apple-blue" />
          <span>{t('common.edit')}</span>
        </Button>
      </div>
      <p className="text-xs text-slate">
        {category.isSerialized ? t('categories.serialized') : t('categories.notSerialized')}
      </p>
    </div>
  );
}

/** Two tables of the detail page plus their add/edit dialogs; owns dialog state. */
function CategoryDetailContent({
  category,
  editOpen,
  onEditOpenChange,
}: {
  category: Category;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
}) {
  // undefined = dialog closed; null = create mode; object = edit mode.
  const [attribute, setAttribute] = useState<CategoryAttribute | null | undefined>(undefined);
  const [model, setModel] = useState<ProductModel | null | undefined>(undefined);

  return (
    <>
      <AttributesTable
        category={category}
        onAdd={() => setAttribute(null)}
        onEdit={setAttribute}
      />

      <CategoryModelsTable
        categoryId={category.id}
        onAdd={() => setModel(null)}
        onEdit={setModel}
      />

      <CategoryFormDialog
        open={editOpen}
        onOpenChange={onEditOpenChange}
        category={category}
      />
      <AttributeFormDialog
        open={attribute !== undefined}
        onOpenChange={(open) => { if (!open) { setAttribute(undefined); } }}
        categoryId={category.id}
        attribute={attribute ?? null}
      />
      <ProductModelFormDialog
        open={model !== undefined}
        onOpenChange={(open) => { if (!open) { setModel(undefined); } }}
        productModel={model ?? null}
        defaultCategoryId={category.id}
      />
    </>
  );
}

/**
 * Category detail page: the category itself, its dynamic attributes and product models
 * (gated by manage_catalog).
 */
export function CategoryDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const categoryId = Number(id);

  const { data: categories = [], isLoading } = useCategories(true);
  const category = categories.find((item) => item.id === categoryId);

  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return <div className="text-xs text-slate">{t('common.loading')}</div>;
  }

  if (!category) {
    return (
      <div className="space-y-4">
        <BackLink to="/categories" label={t('categories.backToList')} />
        <div className="text-xs text-slate">{t('categories.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CategoryDetailHeader category={category} onEdit={() => setEditOpen(true)} />
      <CategoryDetailContent category={category} editOpen={editOpen} onEditOpenChange={setEditOpen} />
    </div>
  );
}
