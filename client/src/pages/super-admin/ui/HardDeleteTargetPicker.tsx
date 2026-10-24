import { useTranslation } from 'react-i18next';
import { SelectField, TextField, Button } from '@/shared/ui';
import type { HardDeleteTargetType } from '@/entities/super-admin';

interface HardDeleteTargetPickerProps {
  type: HardDeleteTargetType;
  onTypeChange: (type: HardDeleteTargetType) => void;
  id: string;
  onIdChange: (id: string) => void;
  onPreview: () => void;
  isPending: boolean;
}

const TYPES: HardDeleteTargetType[] = ['item', 'productModel', 'category'];

/** Picks what to delete: a target type plus the numeric id to preview. */
export function HardDeleteTargetPicker({
  type,
  onTypeChange,
  id,
  onIdChange,
  onPreview,
  isPending,
}: HardDeleteTargetPickerProps) {
  const { t } = useTranslation();
  const options = TYPES.map((value) => ({ value, label: t(`hardDelete.type.${value}`) }));
  const canPreview = /^[1-9]\d*$/.test(id.trim());

  return (
    <form
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (canPreview) onPreview();
      }}
    >
      <SelectField
        label={t('hardDelete.targetType')}
        value={type}
        onValueChange={(v) => onTypeChange(v as HardDeleteTargetType)}
        options={options}
      />
      <TextField
        label={t('hardDelete.targetId')}
        inputMode="numeric"
        value={id}
        onChange={(e) => onIdChange(e.target.value)}
        placeholder={t('hardDelete.targetIdPlaceholder')}
      />
      <Button type="submit" variant="outline" disabled={isPending || !canPreview}>
        {isPending ? t('common.loading') : t('hardDelete.preview')}
      </Button>
    </form>
  );
}
