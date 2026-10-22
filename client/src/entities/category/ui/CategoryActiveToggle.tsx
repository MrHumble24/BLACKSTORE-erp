import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ActiveToggleButton } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useUpdateCategory } from '../api';
import type { Category } from '../model/types';

interface CategoryActiveToggleProps {
  category: Category;
}

/** Activates or deactivates a category instead of deleting it (BR-12). */
export function CategoryActiveToggle({ category }: CategoryActiveToggleProps) {
  const { t } = useTranslation();
  const { mutate: update, isPending } = useUpdateCategory();

  const handleToggle = () => {
    update(
      { id: category.id, payload: { isActive: !category.isActive } },
      {
        onSuccess: () => toast.success(t('categories.updatedSuccess')),
        onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  };

  return (
    <ActiveToggleButton
      isActive={category.isActive}
      isPending={isPending}
      onToggle={handleToggle}
    />
  );
}
