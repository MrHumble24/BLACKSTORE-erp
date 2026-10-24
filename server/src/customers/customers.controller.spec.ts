import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../common/decorators';
import { CustomersController } from './customers.controller';

describe('CustomersController DELETE :id/telegram-link (F24)', () => {
  const handler = CustomersController.prototype.telegramUnlink;

  it('answers 204 and is admin-only (delete_records overrides the controller-wide sell)', () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(204);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(['delete_records']);
  });
});
