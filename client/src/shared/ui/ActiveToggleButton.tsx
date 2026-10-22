import { useTranslation } from 'react-i18next';
import { Button } from './button';

interface ActiveToggleButtonProps {
  isActive: boolean;
  isPending: boolean;
  onToggle: () => void;
}

/** Apple-styled activate / deactivate button used across master data entities. */
export function ActiveToggleButton({ isActive, isPending, onToggle }: ActiveToggleButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      disabled={isPending}
      className={
        isActive
          ? 'h-7.5 px-3.5 rounded-full border-hairline-silver bg-gallery-white text-launch-orange hover:border-launch-orange/40 hover:bg-launch-orange/5 text-xs font-normal'
          : 'h-7.5 px-3.5 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal'
      }
    >
      {isActive ? t('common.deactivate') : t('common.activate')}
    </Button>
  );
}
