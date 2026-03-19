/*
  Warnings:

  - Added the required column `allocation_type` to the `user_storage_volumes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_storage_volumes" ADD COLUMN     "allocation_type" TEXT NOT NULL,
ALTER COLUMN "quota_bytes" DROP DEFAULT;

-- CreateTable
CREATE TABLE "storage_extensions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "storage_volume_id" UUID NOT NULL,
    "extension_type" TEXT NOT NULL,
    "previous_quota_bytes" BIGINT NOT NULL,
    "new_quota_bytes" BIGINT NOT NULL,
    "extension_bytes" BIGINT NOT NULL,
    "amount_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "payment_transaction_id" UUID,
    "wallet_transaction_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "storage_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "storage_extensions_user_id_idx" ON "storage_extensions"("user_id");

-- CreateIndex
CREATE INDEX "storage_extensions_storage_volume_id_idx" ON "storage_extensions"("storage_volume_id");

-- CreateIndex
CREATE INDEX "storage_extensions_created_at_idx" ON "storage_extensions"("created_at");

-- AddForeignKey
ALTER TABLE "storage_extensions" ADD CONSTRAINT "storage_extensions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_extensions" ADD CONSTRAINT "storage_extensions_storage_volume_id_fkey" FOREIGN KEY ("storage_volume_id") REFERENCES "user_storage_volumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_extensions" ADD CONSTRAINT "storage_extensions_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_extensions" ADD CONSTRAINT "storage_extensions_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
