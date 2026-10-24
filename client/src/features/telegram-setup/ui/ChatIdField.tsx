import { useTranslation } from 'react-i18next';
import { SelectField, TextField } from '@/shared/ui';
import type { TelegramChat } from '@/entities/integrations';

interface ChatIdFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  chats: TelegramChat[];
  disabled?: boolean;
}

/**
 * Chat id picker: a dropdown of the bot's chats, or a manual text input when the
 * list is empty. The current value is always kept selectable even if not in the list.
 */
export function ChatIdField({ label, value, onChange, chats, disabled }: ChatIdFieldProps) {
  const { t } = useTranslation();

  if (chats.length === 0) {
    return (
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={t('telegram.chatIdPlaceholder')}
        hint={t('telegram.chatIdHint')}
      />
    );
  }

  const options = chats.map((chat) => ({
    value: String(chat.id),
    label: chat.title ? `${chat.title} (${chat.id})` : String(chat.id),
  }));
  // Keep a previously saved chat id selectable even when it is not in the fetched list.
  if (value && !options.some((o) => o.value === value)) {
    options.unshift({ value, label: value });
  }

  return (
    <SelectField
      label={label}
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={t('telegram.chatIdPlaceholder')}
      disabled={disabled}
    />
  );
}
