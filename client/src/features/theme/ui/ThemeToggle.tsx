import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useThemeStore } from '../model/theme.store';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

/**
 * Apple-styled quiet theme toggle button (Light / Dark).
 */
export function ThemeToggle({ showLabel = false, className }: ThemeToggleProps) {
  const { t } = useTranslation();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size={showLabel ? 'sm' : 'icon'}
      onClick={toggleTheme}
      title={isDark ? t('common.lightTheme') : t('common.darkTheme')}
      aria-label={t('common.toggleTheme')}
      className={`h-8 rounded-full border border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel transition-colors cursor-pointer ${
        showLabel ? 'px-3 gap-1.5' : 'w-8'
      } ${className ?? ''}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-launch-orange transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-apple-blue transition-transform duration-200 rotate-0 hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="text-xs font-normal">
          {isDark ? t('common.lightTheme') : t('common.darkTheme')}
        </span>
      )}
    </Button>
  );
}
