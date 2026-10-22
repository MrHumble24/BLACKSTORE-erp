import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth';
import { Badge, Card } from '@/shared/ui';

/**
 * Empty welcome home page for a logged-in user (handoff F01-FE-01).
 */
export function HomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  return (
    <Card className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-8 md:p-12 shadow-none">
      <div className="max-w-2xl space-y-3">
        <span className="text-xs font-semibold text-launch-orange tracking-[-0.01em]">
          BLACKSTORE
        </span>
        <h1 className="text-3xl md:text-4xl font-semibold font-sf-pro-display text-ink tracking-tight">
          {t('home.welcome', { name: user?.name || '' })}
        </h1>
        <p className="text-sm md:text-base text-slate tracking-[-0.022em]">
          {t('home.description')}
        </p>
        <div className="pt-2 flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            {user?.role.name === 'Admin' ? t('users.adminRole') : t('users.staffRole')}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
