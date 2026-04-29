-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "ephemeral_storage_size_mb" INTEGER;
ALTER TABLE "sessions" ADD COLUMN "ephemeral_storage_path" VARCHAR(512);
