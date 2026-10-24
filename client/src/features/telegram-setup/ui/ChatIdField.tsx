import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Button, SelectField, TextField, type SelectOption } from '@/shared/ui';
import type { TelegramChat } from '@/entities/integrations';

interface ChatIdFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  chats: TelegramChat[];
  /** Saved master switch: the server only discovers chats while Telegram is on. */
  telegramEnabled: boolean;
  disabled?: boolean;
}

/** Sentinel option value that switches the picker to manual entry. */
const MANUAL = '__manual__';

/**
 * Chat id picker: a dropdown of the chats the bot has seen, or a manual text input when the
 * list is empty or the owner chose "Enter manually" (a flooded list or a channel the bot has
 * not posted in yet may be missing). The current value is always kept selectable.
 */
export function ChatIdField({
  label,
  value,
  onChange,
  chats,
  telegramEnabled,
  disabled,
}: ChatIdFieldProps) {
  const { t } = useTranslation();
  const [manual, setManual] = useState(false);
  const hasChats = chats.length > 0;
  const hint = t(pickHintKey(hasChats, telegramEnabled));

  if (!hasChats || manual) {
    return (
      <div className="space-y-1">
        <TextField
          label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={t('telegram.chatIdPlaceholder')}
          hint={hint}
        />
        {hasChats && (
          <Button variant="ghost" size="sm" onClick={() => setManual(false)}>
            {t('telegram.chatIdBackToList')}
          </Button>
        )}
      </div>
    );
  }

  const options = toOptions(chats, value, t);
  options.push({ value: MANUAL, label: t('telegram.chatIdManual') });
  return (
    <div className="space-y-1">
      <SelectField
        label={label}
        value={value}
        onValueChange={(v) => (v === MANUAL ? setManual(true) : onChange(v))}
        options={options}
        placeholder={t('telegram.chatIdPlaceholder')}
        disabled={disabled}
      />
      <p className="text-xs text-slate">{hint}</p>
    </div>
  );
}

/**
 * Options read "<title> · <type> (<id>)", or "<id> · <type>" for untitled (private) chats,
 * so a customer's private chat is never mistaken for a group.
 */
function toOptions(chats: TelegramChat[], value: string, t: TFunction): SelectOption[] {
  const options = chats.map((chat) => {
    const type = t(`telegram.chatType.${chat.type}`, { defaultValue: chat.type });
    const label = chat.title ? `${chat.title} · ${type} (${chat.id})` : `${chat.id} · ${type}`;
    return { value: chat.id, label };
  });
  // Keep a previously saved chat id selectable even when it is not in the fetched list.
  if (value && !options.some((o) => o.value === value)) options.unshift({ value, label: value });
  return options;
}

/** Which "how do I get a chat listed" hint to show; the switch-off hint wins over both others. */
function pickHintKey(hasChats: boolean, telegramEnabled: boolean): string {
  if (!telegramEnabled) return 'telegram.chatPickerDisabled';
  return hasChats ? 'telegram.chatPickerHint' : 'telegram.chatIdHint';
}
