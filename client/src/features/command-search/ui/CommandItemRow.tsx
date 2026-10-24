import { cn } from '@/shared/lib';
import type { CommandItem } from '../model/types';


interface CommandItemRowProps {
  item: CommandItem;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}

/** Individual item row rendered inside the Command+K palette. */
export function CommandItemRow({
  item,
  isSelected,
  onSelect,
  onMouseEnter,
}: CommandItemRowProps) {
  const Icon = item.icon;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={cn(
        'group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer select-none transition-all duration-100',
        isSelected
          ? 'bg-control-gray/80 text-ink dark:bg-[#272930] shadow-2xs'
          : 'text-slate hover:bg-control-gray/40 dark:hover:bg-[#22242a] hover:text-ink',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
            isSelected
              ? 'border-hairline-silver bg-gallery-white text-ink dark:bg-[#1a1b20] dark:border-[#383b44]'
              : 'border-transparent bg-control-gray/50 text-slate dark:bg-[#202228] group-hover:text-ink',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium tracking-[-0.01em] text-ink truncate">
            {item.title}
          </span>
          {item.subtitle && (
            <span className="text-[11px] text-steel truncate mt-0.5">
              {item.subtitle}
            </span>
          )}
        </div>
      </div>
      {item.shortcut && (
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-steel bg-control-gray/60 dark:bg-[#22242a] border border-hairline-silver/60 dark:border-[#333640] rounded">
          {item.shortcut}
        </kbd>
      )}
    </div>
  );
}
