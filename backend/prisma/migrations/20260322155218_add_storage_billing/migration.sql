-- AlterTable
ALTER TABLE "billing_charges" ADD COLUMN     "charge_type" TEXT NOT NULL DEFAULT 'compute',
ADD COLUMN     "quota_gb" INTEGER,
ADD COLUMN     "storage_volume_id" UUID,
ALTER COLUMN "session_id" DROP NOT NULL,
ALTER COLUMN "compute_config_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_storage_volumes" ADD COLUMN     "price_per_gb_cents_month" INTEGER NOT NULL DEFAULT 700;

-- CreateIndex
CREATE INDEX "billing_charges_storage_volume_id_idx" ON "billing_charges"("storage_volume_id");

-- AddForeignKey
ALTER TABLE "billing_charges" ADD CONSTRAINT "billing_charges_storage_volume_id_fkey" FOREIGN KEY ("storage_volume_id") REFERENCES "user_storage_volumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
