# BLACKSTORE backup restore

Backups are written to `BACKUP_DIR` as `blackstore-YYYY-MM-DD-HHmm.sql.gz.enc`: a
`pg_dump` (plain SQL, taken with `--clean --if-exists`), gzipped, then encrypted with
`openssl enc -aes-256-cbc -pbkdf2`. Each file has a `.json` sidecar with its off-site flags.

There are two ways to restore. **Prefer the app button** (Admin → Backups → Restore): it
takes a fresh safety backup first, then restores in one transaction. Use the manual steps
below only when the app itself is down.

## What you need

- The encrypted file, e.g. `blackstore-2026-10-22-0300.sql.gz.enc`.
- `BACKUP_PASSPHRASE` (the exact value used when the backup was written — without it the file
  cannot be decrypted; keep it somewhere separate from the backups).
- `psql` / `openssl` / `gunzip` on the machine, and the target `DATABASE_URL`.

## Manual restore (app is down)

Run from a shell on the server. Pass the passphrase through the environment, never on the
command line:

```sh
export BACKUP_PASSPHRASE='...'            # the value used at backup time
F=blackstore-2026-10-22-0300.sql.gz.enc   # the file to restore

# 1. Decrypt → 2. gunzip → one plain-SQL dump
openssl enc -d -aes-256-cbc -pbkdf2 -in "$F" -out dump.sql.gz -pass env:BACKUP_PASSPHRASE
gunzip -f dump.sql.gz                      # → dump.sql

# 3. (Safety) dump the current database first, in case the restore is wrong
pg_dump --clean --if-exists --no-owner --no-privileges -f pre-restore.sql -d "$DATABASE_URL"

# 4. Restore into a FRESH, empty database, or over the current one.
#    --single-transaction: a failure rolls back and leaves the database untouched.
#    The dump was taken with --clean --if-exists, so it drops and recreates each object.
createdb blackstore_restored               # optional: restore into a new database
psql --single-transaction -v ON_ERROR_STOP=1 -d "postgresql://USER:PASS@localhost:5432/blackstore_restored" -f dump.sql

# 5. Point the app at the restored database and restart it.
#    Edit server/.env: DATABASE_URL=postgresql://.../blackstore_restored
```

Delete `dump.sql`, `dump.sql.gz` and `pre-restore.sql` when you are done — they are
unencrypted copies of the whole database.

## Off-site second copy

`BACKUP_SECOND_DIR` must be **separate storage** — a mounted network drive or a folder synced
to cloud storage — never another directory on the same disk. A disk that dies takes both
copies with it otherwise. Telegram (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_BACKUP_CHAT_ID`) is a
third, off-machine copy for files under 49 MB.

## Monthly test-restore checklist

Do this once a month; a backup you have never restored is not a backup.

- [ ] Pick the newest `*.sql.gz.enc` and copy it to a scratch machine.
- [ ] Decrypt + gunzip with the stored `BACKUP_PASSPHRASE` (steps 1–2). It must succeed.
- [ ] `createdb blackstore_testrestore` and restore into it (step 4). No errors.
- [ ] Spot-check row counts: `select count(*) from "Item";`, `"Sale"`, `"AuditLog"` look sane.
- [ ] Confirm the off-site copy exists (second dir and/or Telegram) for the same day.
- [ ] Drop the scratch database and delete the decrypted files.
- [ ] Note the date and result in the ops log.
