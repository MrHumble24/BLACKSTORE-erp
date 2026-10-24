import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import i18n from '@/shared/i18n';

/**
 * Registers the service worker and, when a new build is ready, prompts the user
 * to reload via the app's sonner toast. Reload applies the fresh app shell.
 */
export function registerPwa(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast.info(i18n.t('pwa.updateAvailable'), {
        duration: Infinity,
        action: {
          label: i18n.t('pwa.reload'),
          onClick: () => void updateSW(true),
        },
      });
    },
  });
}
