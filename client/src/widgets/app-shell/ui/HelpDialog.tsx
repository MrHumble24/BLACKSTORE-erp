import { useTranslation } from 'react-i18next';
import { HelpCircle, ScanLine, Tag, Wallet, Lock, Undo2, Zap } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/shared/ui';

/** Everyday tips shown in the help dialog; each entry maps to help.<key>.t/.d translations. */
const TIPS = [
  { key: 'sell', Icon: Zap },
  { key: 'scan', Icon: ScanLine },
  { key: 'minPrice', Icon: Tag },
  { key: 'debt', Icon: Wallet },
  { key: 'returns', Icon: Undo2 },
  { key: 'noDelete', Icon: Lock },
] as const;

/** Header "?" button that opens a short, in-app how-to-use guide (localized). */
export function HelpDialog() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('help.title')}
          title={t('help.title')}
          className="h-8 w-8 text-slate hover:text-ink rounded-full cursor-pointer"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('help.title')}</DialogTitle>
          <DialogDescription>{t('help.subtitle')}</DialogDescription>
        </DialogHeader>
        <ul className="mt-1 flex flex-col divide-y divide-hairline-silver/50">
          {TIPS.map(({ key, Icon }) => (
            <li key={key} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-studio-mist text-slate">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{t(`help.${key}.t`)}</p>
                <p className="text-[13px] text-slate">{t(`help.${key}.d`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
