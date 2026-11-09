import type { TelegramFeatures } from '../integrations/telegram-config.service';
import { BUTTONS, buttonRows, isButton, keyboardFor } from './menu';

const ON: TelegramFeatures = {
  lowStockDigest: true,
  ownerSnapshot: true,
  customerReceipts: true,
  debtReminders: true,
  warrantyReminders: true,
  investorReports: true,
  dayCloseAlerts: true,
  matchAlerts: false,
};
const investor = { id: 7, name: 'Ali' };

describe('menu', () => {
  it('roles combine: customer + investor get both rows', () => {
    expect(buttonRows({ owner: false, customerId: 1, investor }, ON)).toEqual([
      [BUTTONS.myDebt, BUTTONS.warranty],
      [BUTTONS.thisMonth, BUTTONS.lastMonth],
    ]);
  });

  it('a switch off hides its button; a role with every switch off adds no row', () => {
    const f = { ...ON, ownerSnapshot: false, warrantyReminders: false, investorReports: false };
    expect(buttonRows({ owner: true, customerId: 1, investor }, f)).toEqual([
      [BUTTONS.lowStock, BUTTONS.debtors],
      [BUTTONS.myDebt],
    ]);
  });

  it('keyboard is persistent; a stranger (no buttons) gets null', () => {
    expect(keyboardFor({ owner: true }, ON)).toEqual({
      keyboard: [
        [BUTTONS.status, BUTTONS.cash],
        [BUTTONS.lowStock, BUTTONS.debtors],
      ],
      resize_keyboard: true,
      is_persistent: true,
    });
    expect(keyboardFor({ owner: false }, ON)).toBeNull();
    expect(keyboardFor({ owner: false, investor }, { ...ON, investorReports: false })).toBeNull();
  });

  it('isButton matches labels exactly', () => {
    expect(isButton(BUTTONS.cash)).toBe(true);
    expect(isButton(BUTTONS.debtors)).toBe(true);
    expect(isButton('/status')).toBe(false);
  });
});
