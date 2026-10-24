import { useTranslation } from 'react-i18next';
import { Bot, ExternalLink } from 'lucide-react';

/**
 * Connected bot header: icon, display name, @username and an "Open bot" link.
 * Env-only bots have no username, so neither the handle nor the link is shown.
 */
export function BotIdentity({ name, username }: { name: string; username: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <Bot className="h-5 w-5 shrink-0 text-pricing-blue" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-ink">{name}</p>
        {username && (
          <p className="flex items-center gap-2 text-xs text-slate">
            <span>@{username}</span>
            <a
              href={`https://t.me/${username}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-pricing-blue hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {t('telegram.openBot')}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
