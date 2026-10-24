import { BadRequestException } from '@nestjs/common';
import { mkdtemp, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { PublicUser } from '../common/auth-user';
import type { AuditService } from '../audit/audit.service';
import type { TelegramConfigService } from '../integrations/telegram-config.service';
import { BACKUP_NAME, backupFileName, prune } from './backup-files';
import { pgDump, pgEnv } from './backup-runner';
import { telegramSkipReason, TELEGRAM_MAX_BYTES } from '../common/telegram';
import { BackupsService } from './backups.service';

describe('backupFileName', () => {
  it('formats the local time to second precision and matches BACKUP_NAME', () => {
    // 22 Oct 2026, 03:05:09 local
    const name = backupFileName(new Date(2026, 9, 22, 3, 5, 9));
    expect(name).toBe('blackstore-2026-10-22-030509.sql.gz.enc');
    expect(BACKUP_NAME.test(name)).toBe(true);
  });

  it('BACKUP_NAME rejects sidecars, tmp files and traversal', () => {
    for (const bad of [`${backupFileName()}.json`, '.tmp-1.sql.gz', '../blackstore-2026-10-22-030509.sql.gz.enc']) {
      expect(BACKUP_NAME.test(bad)).toBe(false);
    }
  });
});

describe('backup runner', () => {
  const url = 'postgresql://bkuser:S3cret%40Pass@127.0.0.1:1/nodb?schema=public';

  it('pgEnv splits the URL into libpq vars', () => {
    expect(pgEnv(url)).toEqual({
      PGHOST: '127.0.0.1',
      PGPORT: '1',
      PGUSER: 'bkuser',
      PGPASSWORD: 'S3cret@Pass',
      PGDATABASE: 'nodb',
    });
  });

  it('a failed pg_dump never puts the password in the error', async () => {
    const error = (await pgDump(url, join(tmpdir(), 'never.sql')).catch((e: unknown) => e)) as Error;
    expect(error.message).toMatch(/^pg_dump failed/);
    expect(error.message).not.toContain('S3cret');
  });
});

describe('prune', () => {
  it('keeps only the newest N .enc files and drops their sidecars too', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bk-'));
    try {
      for (let i = 1; i <= 5; i += 1) {
        const name = `blackstore-2026-10-0${i}-0300.sql.gz.enc`;
        // eslint-disable-next-line no-await-in-loop
        await writeFile(join(dir, name), 'x');
        // eslint-disable-next-line no-await-in-loop
        await writeFile(join(dir, `${name}.json`), '{}');
      }
      await prune(dir, 3);
      const left = (await readdir(dir)).filter((n) => n.endsWith('.enc')).sort();
      expect(left).toEqual([
        'blackstore-2026-10-03-0300.sql.gz.enc',
        'blackstore-2026-10-04-0300.sql.gz.enc',
        'blackstore-2026-10-05-0300.sql.gz.enc',
      ]);
      // the pruned files' sidecars are gone
      expect((await readdir(dir)).includes('blackstore-2026-10-01-0300.sql.gz.enc.json')).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('telegramSkipReason', () => {
  it('skips when either variable is empty', () => {
    expect(telegramSkipReason('', 'chat', 10)).toMatch(/empty/);
    expect(telegramSkipReason('token', '', 10)).toMatch(/empty/);
  });

  it('skips a file over 49 MB', () => {
    expect(telegramSkipReason('token', 'chat', TELEGRAM_MAX_BYTES + 1)).toMatch(/49 MB/);
  });

  it('allows a configured, small file', () => {
    expect(telegramSkipReason('token', 'chat', 1024)).toBeNull();
  });
});

describe('BackupsService.restore', () => {
  it('rejects a file name with a path traversal before touching the disk', async () => {
    const service = new BackupsService(
      {} as ConfigService,
      {} as AuditService,
      {} as TelegramConfigService,
    );
    for (const name of ['../etc/passwd', 'blackstore-2026-10-22-030509.sql.gz.enc.json']) {
      // eslint-disable-next-line no-await-in-loop
      await expect(service.restore(name, name, { id: 1 } as PublicUser)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
  });
});
