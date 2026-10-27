import type { ReplyMarkup } from '../common/telegram';
import type { TelegramFeatures } from '../integrations/telegram-config.service';

/** Button labels of the bot's reply keyboard (F22). The label IS the message the bot receives. */
export const BUTTONS = {
  status: '📊 Holat',
  cash: '💵 Kassa',
  lowStock: '📦 Kam qolgan tovarlar',
  debtors: '💳 Qarzdorlar',
  myDebt: '💳 Mening qarzim',
  warranty: '🛡 Kafolat',
  thisMonth: '📈 Shu oy',
  lastMonth: "📈 O'tgan oy",
} as const;

export type Button = (typeof BUTTONS)[keyof typeof BUTTONS];

const ALL_BUTTONS = new Set<string>(Object.values(BUTTONS));

/** Who a private chat belongs to; roles combine (owner + customer, customer + investor ...). */
export interface Role {
  owner: boolean;
  customerId?: number;
  investor?: { id: number; name: string };
}

/** Keep only the labels whose switch is on. */
const pick = (pairs: [Button, boolean][]): Button[] => pairs.filter(([, on]) => on).map(([b]) => b);

/** One keyboard row per role, each button hidden when its feature switch is off; empty rows dropped. */
export function buttonRows(role: Role, f: TelegramFeatures): Button[][] {
  const rows: Button[][] = [];
  if (role.owner) {
    const r1 = pick([[BUTTONS.status, f.ownerSnapshot], [BUTTONS.cash, f.ownerSnapshot]]);
    if (r1.length) rows.push(r1);
    const r2 = pick([[BUTTONS.lowStock, true], [BUTTONS.debtors, true]]);
    if (r2.length) rows.push(r2);
  }
  if (role.customerId) {
    rows.push(pick([[BUTTONS.myDebt, f.debtReminders], [BUTTONS.warranty, f.warrantyReminders]]));
  }
  if (role.investor) {
    rows.push(pick([[BUTTONS.thisMonth, f.investorReports], [BUTTONS.lastMonth, f.investorReports]]));
  }
  return rows.filter((r) => r.length > 0);
}

/** The persistent reply keyboard for this role, or null when it has no buttons (a stranger). */
export function keyboardFor(role: Role, f: TelegramFeatures): ReplyMarkup | null {
  const rows = buttonRows(role, f);
  return rows.length ? { keyboard: rows, resize_keyboard: true, is_persistent: true } : null;
}

/** True when the text is one of the bot's button labels (for any role). */
export function isButton(text: string): text is Button {
  return ALL_BUTTONS.has(text);
}
