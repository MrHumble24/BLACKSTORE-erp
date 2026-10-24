import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Send } from 'lucide-react';
import { Badge, Button, BackLink } from '@/shared/ui';
import {
  useInvestorTelegramLink,
  useInvestorTelegramUnlink,
  type Investor,
} from '@/entities/investor';
import { TelegramInviteButton, TelegramLinkStatus } from '@/features/telegram-invite';

interface HeaderProps {
  investor: Investor;
  onEdit: () => void;
  onAddTx: () => void;
  /** Set for a linked investor (F26): opens the "Send money" supplier payment dialog. */
  onSendMoney?: () => void;
  onRefresh: () => void;
}

/**
 * Telegram link status (with Unlink, even for inactive investors so they can be cleaned up) or the
 * invite button for a real, active investor; the business investor has no chat to link.
 * The page already requires manage_investors, which is also the unlink permission.
 */
function InvestorTelegramInvite({ investor, onRefresh }: { investor: Investor; onRefresh: () => void }) {
  const telegramLink = useInvestorTelegramLink();
  const telegramUnlink = useInvestorTelegramUnlink();
  if (investor.telegramLinked) {
    return (
      <TelegramLinkStatus
        id={investor.id}
        linkedAt={investor.telegramLinkedAt}
        linkedBy={investor.telegramLinkedBy}
        canUnlink
        unlink={telegramUnlink}
        onDone={onRefresh}
      />
    );
  }
  if (investor.isOwn || !investor.isActive) return null;
  return (
    <TelegramInviteButton
      name={investor.name}
      request={() => telegramLink.mutateAsync(investor.id)}
      onClose={onRefresh}
    />
  );
}

const PRIMARY_BUTTON =
  'gap-2 bg-pricing-blue hover:bg-pricing-blue/90 text-white rounded-full text-xs font-medium px-5 h-8 shadow-none border-0';

/** Telegram, edit, add-transaction and (linked only) send-money actions. */
function HeaderActions({ investor, onEdit, onAddTx, onSendMoney, onRefresh }: HeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <InvestorTelegramInvite investor={investor} onRefresh={onRefresh} />
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="h-8 px-4 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal gap-1.5"
      >
        <Pencil className="h-3 w-3 text-apple-blue" />
        <span>{t('investors.editInvestor')}</span>
      </Button>
      <Button onClick={onAddTx} variant={onSendMoney ? 'outline' : 'default'} className={onSendMoney ? 'h-8 px-4 rounded-full text-xs gap-1.5' : PRIMARY_BUTTON}>
        <Plus className="h-3.5 w-3.5" />
        <span>{t('investors.addTransaction')}</span>
      </Button>
      {onSendMoney && (
        // Deactivated investor or supplier record: history stays visible, no new money is sent.
        <Button
          onClick={onSendMoney}
          disabled={!investor.isActive || investor.supplier?.isActive === false}
          className={PRIMARY_BUTTON}
        >
          <Send className="h-3.5 w-3.5" />
          <span>{t('investors.account.sendMoney')}</span>
        </Button>
      )}
    </div>
  );
}

/** Name with business/active badges, the code line and the header actions. */
export function InvestorDetailHeader(props: HeaderProps) {
  const { t } = useTranslation();
  const { investor } = props;

  return (
    <div className="space-y-3">
      <BackLink to="/investors" label={t('investors.backToList')} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {investor.name}
          </h1>
          {investor.isOwn && (
            <Badge variant="secondary" className="px-2.5 py-0.5 text-[11px]">
              {t('investors.business')}
            </Badge>
          )}
          <Badge variant={investor.isActive ? 'active' : 'destructive'} className="px-2.5 py-0.5 text-[11px]">
            {investor.isActive ? t('common.active') : t('common.inactive')}
          </Badge>
        </div>
        <HeaderActions {...props} />
      </div>
      <p className="text-xs text-slate">{t('investors.code')}: {investor.code}</p>
    </div>
  );
}
