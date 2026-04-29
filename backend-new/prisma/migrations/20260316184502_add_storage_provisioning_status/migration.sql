-- AlterTable
ALTER TABLE "users" ADD COLUMN     "storage_provisioned_at" TIMESTAMP(3),
ADD COLUMN     "storage_provisioning_error" TEXT,
ADD COLUMN     "storage_provisioning_status" TEXT;
