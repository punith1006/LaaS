/*
  Warnings:

  - You are about to drop the column `spend_limit_cents` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `spend_rate_cents_per_hour` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "spend_limit_cents",
DROP COLUMN "spend_rate_cents_per_hour";

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "spend_limit_cents" INTEGER,
ADD COLUMN     "spend_limit_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spend_limit_period" TEXT;
