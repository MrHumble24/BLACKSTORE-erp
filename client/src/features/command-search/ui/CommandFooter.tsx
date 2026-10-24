import { useTranslation } from 'react-i18next';

/** Subtle keyboard shortcut hints footer at the bottom of the Command+K palette. */
export function CommandFooter() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between border-t border-hairline-silver/70 dark:border-[#2d3039] bg-studio-mist/50 dark:bg-[#16171b] px-4 py-2.5 text-[11px] text-steel">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-hairline-silver/80 dark:border-[#333640] bg-gallery-white dark:bg-[#202228] px-1 py-0.5 text-[10px] font-mono leading-none">
            ↑
          </kbd>
          <kbd className="rounded border border-hairline-silver/80 dark:border-[#333640] bg-gallery-white dark:bg-[#202228] px-1 py-0.5 text-[10px] font-mono leading-none">
            ↓
          </kbd>
          <span className="ml-1 text-slate">{t('command.navigateHint')}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-hairline-silver/80 dark:border-[#333640] bg-gallery-white dark:bg-[#202228] px-1.5 py-0.5 text-[10px] font-mono leading-none">
            ↵
          </kbd>
          <span className="ml-1 text-slate">{t('command.openHint')}</span>
        </span>
      </div>
      <span className="inline-flex items-center gap-1">
        <kbd className="rounded border border-hairline-silver/80 dark:border-[#333640] bg-gallery-white dark:bg-[#202228] px-1.5 py-0.5 text-[10px] font-mono leading-none">
          ESC
        </kbd>
        <span className="ml-1 text-slate">{t('command.closeHint')}</span>
      </span>
    </div>
  );
}
