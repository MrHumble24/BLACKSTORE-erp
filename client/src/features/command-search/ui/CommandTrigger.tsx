import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { cn } from '@/shared/lib';
import { useCommandStore, isMacPlatform } from '../model/command.store';

interface CommandTriggerProps {
  className?: string;
}

/** Header search trigger button with Apple-styled ⌘K / Ctrl+K badge. */
export function CommandTrigger({ className }: CommandTriggerProps) {
  const { t } = useTranslation();
  const setOpen = useCommandStore((state) => state.setOpen);
  const isMac = isMacPlatform();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'group flex h-8 w-36 sm:w-40 md:w-48 items-center justify-between rounded-[980px] border border-hairline-silver bg-gallery-white px-2.5 text-xs text-steel transition-all duration-150',
        'hover:border-steel/60 hover:text-ink hover:bg-studio-mist/40',
        'dark:bg-[#1a1b20] dark:border-[#2d3039] dark:hover:border-[#424652] dark:hover:bg-[#202228]',
        'cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-pricing-blue/30',
        className,
      )}

      aria-label="Open command palette"
    >
      <div className="flex items-center gap-2 truncate">
        <Search className="h-3.5 w-3.5 text-steel group-hover:text-ink transition-colors" />
        <span className="truncate tracking-[-0.01em]">
          {t('command.triggerPlaceholder')}
        </span>
      </div>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-hairline-silver/80 bg-control-gray/60 px-1.5 py-0.5 text-[10px] font-mono text-steel group-hover:text-ink group-hover:border-steel/50 dark:bg-[#25272e] dark:border-[#383b44] transition-colors">
        <span>{isMac ? '⌘' : 'Ctrl'}</span>
        <span>K</span>
      </kbd>
    </button>
  );
}
