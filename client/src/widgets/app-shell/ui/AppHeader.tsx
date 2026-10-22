import { useTranslation } from 'react-i18next';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button, Badge } from '@/shared/ui';
import { useAuthStore, useLogout } from '@/features/auth';
import { ScanField } from '@/features/scan';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Apple-styled persistent application header with ScanField and quiet controls.
 */
export function AppHeader() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canViewStock = hasPermission('view_stock');
  const { mutate: logout, isPending } = useLogout();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-hairline-silver/70 bg-gallery-white/80 px-8 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <span className="text-base font-semibold tracking-tight text-ink">
          BLACKSTORE
        </span>
        {user && canViewStock && <ScanField />}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex h-8 items-center gap-2.5 rounded-full border border-hairline-silver bg-gallery-white px-3.5 text-xs text-ink">
            <UserIcon className="h-3.5 w-3.5 text-slate" />
            <span className="font-medium tracking-[-0.01em]">{user.name}</span>
            <Badge variant="secondary" className="px-2 py-0 text-[10px]">
              {user.role.name === 'Admin' ? t('users.adminRole') : t('users.staffRole')}
            </Badge>
          </div>
        )}

        <LanguageSwitcher />

        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          disabled={isPending}
          className="h-8 px-3.5 rounded-full border border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 text-slate" />
          <span>{t('common.logout')}</span>
        </Button>
      </div>
    </header>
  );
}
