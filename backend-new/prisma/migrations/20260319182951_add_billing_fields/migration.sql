-- AlterTable
ALTER TABLE "users" ADD COLUMN     "spend_limit_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "spend_rate_cents_per_hour" INTEGER NOT NULL DEFAULT 0;
