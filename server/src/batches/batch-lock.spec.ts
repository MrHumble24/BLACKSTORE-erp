import { ForbiddenException } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { BATCH_EDIT_DAYS, assertBatchEditable, isPastBatch } from './batch-lock';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const actor = (permissions: string[]): PublicUser =>
  ({ id: 1, role: { permissions } }) as unknown as PublicUser;

describe('isPastBatch', () => {
  it('is false for a batch that arrived today', () => {
    expect(isPastBatch({ arrivalDate: new Date() })).toBe(false);
  });

  it('is false on the edit-window boundary', () => {
    expect(isPastBatch({ arrivalDate: daysAgo(BATCH_EDIT_DAYS) })).toBe(false);
  });

  it('is true once older than the edit window', () => {
    expect(isPastBatch({ arrivalDate: daysAgo(BATCH_EDIT_DAYS + 1) })).toBe(true);
  });
});

describe('assertBatchEditable', () => {
  const past = { arrivalDate: daysAgo(BATCH_EDIT_DAYS + 1) };

  it('passes a recent batch for anyone', () => {
    expect(() => assertBatchEditable({ arrivalDate: new Date() }, actor([]))).not.toThrow();
  });

  it('403s a past batch without edit_past_records', () => {
    expect(() => assertBatchEditable(past, actor(['receive_batch']))).toThrow(ForbiddenException);
  });

  it('allows a past batch with edit_past_records', () => {
    expect(() => assertBatchEditable(past, actor(['edit_past_records']))).not.toThrow();
  });
});
