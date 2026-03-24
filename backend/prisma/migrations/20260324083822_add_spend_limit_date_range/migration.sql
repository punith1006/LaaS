-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "spend_limit_consented_at" TIMESTAMP(3),
ADD COLUMN     "spend_limit_end_date" TIMESTAMP(3),
ADD COLUMN     "spend_limit_start_date" TIMESTAMP(3),
ADD COLUMN     "spend_limit_warning_85_sent" BOOLEAN NOT NULL DEFAULT false;
