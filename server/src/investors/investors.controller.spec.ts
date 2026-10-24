import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../common/decorators';
import { InvestorsController } from './investors.controller';

describe('InvestorsController DELETE :id/telegram-link (F24)', () => {
  const handler = InvestorsController.prototype.telegramUnlink;

  it('answers 204 and needs manage_investors', () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(204);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(['manage_investors']);
  });
});
