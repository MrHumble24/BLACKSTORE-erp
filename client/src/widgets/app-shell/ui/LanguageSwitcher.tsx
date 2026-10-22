import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
} from '@/shared/ui';
import { useAuthStore, useChangeLanguage } from '@/features/auth';
import type { Language } from '@/entities/user';

/** Apple-styled language dropdown selector (renders inside the shell, where a user is always present). */
export function LanguageSwitcher() {
  const user = useAuthStore((state) => state.user);
  const { mutate: changeLanguage, isPending } = useChangeLanguage();

  const currentLang: Language = user?.language ?? 'uz';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 rounded-full border border-hairline-silver bg-gallery-white gap-1.5 text-xs font-normal text-ink hover:bg-studio-mist hover:border-steel transition-colors cursor-pointer"
          disabled={isPending}
        >
          <Globe className="h-3.5 w-3.5 text-slate" />
          <span className="uppercase font-medium text-xs">{currentLang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => changeLanguage('uz')}
          className={currentLang === 'uz' ? 'font-medium bg-control-gray/50' : ''}
        >
          🇺🇿 O'zbekcha
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('ru')}
          className={currentLang === 'ru' ? 'font-medium bg-control-gray/50' : ''}
        >
          🇷🇺 Русский
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={currentLang === 'en' ? 'font-medium bg-control-gray/50' : ''}
        >
          🇬🇧 English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
