import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, User as UserIcon, Menu, Search } from 'lucide-react';
import { Button, Badge, Sheet, SheetContent } from '@/shared/ui';
import { useAuthStore, useLogout } from '@/features/auth';
import type { User } from '@/entities/user';
import { ScanField } from '@/features/scan';
import { SidebarNavList } from './AppSidebar';
import { LanguageSwitcher } from './LanguageSwitcher';
import { HelpDialog } from './HelpDialog';
import { ThemeToggle } from '@/features/theme';

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onLogout: () => void;
  isLoggingOut: boolean;
}

/** Slide-over navigation drawer for mobile and tablet screens (< 1024px). */
function MobileNavDrawer({
  open,
  onOpenChange,
  user,
  onLogout,
  isLoggingOut,
}: MobileNavDrawerProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col justify-between">
        <div className="p-4 border-b border-hairline-silver/60">
          <span className="text-base font-semibold tracking-tight text-ink block">
            BLACKSTORE
          </span>
          {user && (
            <span className="text-[11px] text-slate block truncate mt-0.5">
              {user.name} ({user.role.name === 'Admin' ? t('users.adminRole') : t('users.staffRole')})
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SidebarNavList onNavigate={() => onOpenChange(false)} />
        </div>
        <div className="p-4 border-t border-hairline-silver/60 flex items-center justify-between gap-2 bg-studio-mist/40">
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="h-8 px-3 rounded-full border border-hairline-silver bg-gallery-white text-xs gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-slate" />
            <span>{t('common.logout')}</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Apple-styled persistent application header with responsive mobile drawer toggle,
 * mobile quick-scan strip and quiet controls.
 */
export function AppHeader() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canViewStock = hasPermission('view_stock');
  const { mutate: logout, isPending } = useLogout();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-hairline-silver/70 bg-gallery-white/80 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden h-8 w-8 text-ink hover:bg-control-gray/60 rounded-full cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-base font-semibold tracking-tight text-ink">
            BLACKSTORE
          </span>
          {user && canViewStock && (
            <>
              <div className="hidden sm:block">
                <ScanField />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                className="sm:hidden h-8 w-8 text-slate hover:text-ink rounded-full cursor-pointer"
                aria-label="Toggle mobile search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="flex h-8 items-center gap-1.5 sm:gap-2.5 rounded-full border border-hairline-silver bg-gallery-white px-2.5 sm:px-3.5 text-xs text-ink">
              <UserIcon className="h-3.5 w-3.5 text-slate shrink-0" />
              <span className="font-medium tracking-[-0.01em] max-w-[90px] sm:max-w-[140px] truncate">
                {user.name}
              </span>
              <Badge variant="secondary" className="hidden sm:inline-flex px-2 py-0 text-[10px]">
                {user.role.name === 'Admin' ? t('users.adminRole') : t('users.staffRole')}
              </Badge>
            </div>
          )}

          <HelpDialog />

          <ThemeToggle />

          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            disabled={isPending}
            className="h-8 px-2.5 sm:px-3.5 rounded-full border border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-slate shrink-0" />
            <span className="hidden sm:inline">{t('common.logout')}</span>
          </Button>
        </div>
      </div>

      {user && canViewStock && mobileSearchOpen && (
        <div className="sm:hidden w-full border-t border-hairline-silver/60 bg-gallery-white px-3 py-2">
          <ScanField className="w-full" />
        </div>
      )}

      <MobileNavDrawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        user={user}
        onLogout={() => logout()}
        isLoggingOut={isPending}
      />
    </header>
  );
}
