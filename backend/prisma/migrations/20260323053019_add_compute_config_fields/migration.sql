-- AlterTable
ALTER TABLE "compute_configs" ADD COLUMN     "best_for" TEXT,
ADD COLUMN     "gpu_model" TEXT,
ADD COLUMN     "max_concurrent_per_node" INTEGER NOT NULL DEFAULT 1;
