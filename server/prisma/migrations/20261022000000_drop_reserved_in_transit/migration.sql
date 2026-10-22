-- AlterEnum
BEGIN;
CREATE TYPE "ItemStatus_new" AS ENUM ('IN_STOCK', 'AT_PARTNER', 'DEBT', 'SOLD', 'RETURNED', 'DEFECTIVE');
ALTER TABLE "public"."Item" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Item" ALTER COLUMN "status" TYPE "ItemStatus_new" USING ("status"::text::"ItemStatus_new");
ALTER TYPE "ItemStatus" RENAME TO "ItemStatus_old";
ALTER TYPE "ItemStatus_new" RENAME TO "ItemStatus";
DROP TYPE "public"."ItemStatus_old";
ALTER TABLE "Item" ALTER COLUMN "status" SET DEFAULT 'IN_STOCK';
COMMIT;

