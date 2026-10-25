-- Fix forward for 20261024000000_daily_close: its seed used CURRENT_TIMESTAMP into a
-- TIMESTAMP(3) (no time zone) column, which stores the session's local time, while Prisma
-- stores every DateTime as UTC. On a non-UTC server the seeded OPEN day ended up in the
-- future, hiding today's sales from GET /business-day/current. Convert only a future-dated
-- OPEN day from session-local time to UTC; a correct row is left untouched.
UPDATE "BusinessDay"
SET "openedAt" = ("openedAt" AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'UTC'
WHERE "status" = 'OPEN' AND "openedAt" > timezone('UTC', now());
