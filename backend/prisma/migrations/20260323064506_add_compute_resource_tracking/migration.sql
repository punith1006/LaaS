/*
  Warnings:

  - The `termination_reason` column on the `sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StorageMode" AS ENUM ('stateful', 'ephemeral');

-- CreateEnum
CREATE TYPE "SessionTerminationReason" AS ENUM ('user_requested', 'idle_timeout', 'resource_exhaustion', 'spend_limit_exceeded', 'node_failure', 'node_maintenance', 'admin_terminated', 'session_expired', 'booking_expired', 'error_unrecoverable', 'network_disconnect', 'quota_exceeded');

-- AlterTable
ALTER TABLE "nodes" ADD COLUMN     "current_session_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_resource_sync_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "allocated_gpu_vram_mb" INTEGER,
ADD COLUMN     "allocated_hami_sm_percent" INTEGER,
ADD COLUMN     "allocated_memory_mb" INTEGER,
ADD COLUMN     "allocated_vcpu" INTEGER,
ADD COLUMN     "allocation_snapshot_at" TIMESTAMP(3),
ADD COLUMN     "cost_last_updated_at" TIMESTAMP(3),
ADD COLUMN     "cumulative_cost_cents" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "duration_seconds" INTEGER,
ADD COLUMN     "instance_name" VARCHAR(256),
ADD COLUMN     "storage_mode" "StorageMode" NOT NULL DEFAULT 'ephemeral',
ADD COLUMN     "terminated_at" TIMESTAMP(3),
ADD COLUMN     "terminated_by" UUID,
ADD COLUMN     "termination_details" JSONB,
DROP COLUMN "termination_reason",
ADD COLUMN     "termination_reason" "SessionTerminationReason";

-- CreateTable
CREATE TABLE "node_resource_reservations" (
    "id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "reserved_vcpu" INTEGER NOT NULL,
    "reserved_memory_mb" INTEGER NOT NULL,
    "reserved_gpu_vram_mb" INTEGER NOT NULL,
    "reserved_hami_sm_percent" INTEGER,
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_resource_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "node_resource_reservations_session_id_key" ON "node_resource_reservations"("session_id");

-- CreateIndex
CREATE INDEX "node_resource_reservations_node_id_status_idx" ON "node_resource_reservations"("node_id", "status");

-- CreateIndex
CREATE INDEX "node_resource_reservations_session_id_idx" ON "node_resource_reservations"("session_id");

-- CreateIndex
CREATE INDEX "node_resource_reservations_released_at_idx" ON "node_resource_reservations"("released_at");

-- CreateIndex
CREATE UNIQUE INDEX "node_resource_reservations_node_id_session_id_key" ON "node_resource_reservations"("node_id", "session_id");

-- CreateIndex
CREATE INDEX "nodes_last_resource_sync_at_idx" ON "nodes"("last_resource_sync_at");

-- CreateIndex
CREATE INDEX "sessions_storage_mode_idx" ON "sessions"("storage_mode");

-- CreateIndex
CREATE INDEX "sessions_instance_name_idx" ON "sessions"("instance_name");

-- AddForeignKey
ALTER TABLE "node_resource_reservations" ADD CONSTRAINT "node_resource_reservations_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_resource_reservations" ADD CONSTRAINT "node_resource_reservations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
