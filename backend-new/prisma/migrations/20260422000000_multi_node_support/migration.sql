-- CreateEnum: StorageBackend
CREATE TYPE "StorageBackend" AS ENUM ('zfs_dataset', 'zfs_zvol');

-- CreateEnum: StorageTransport
CREATE TYPE "StorageTransport" AS ENUM ('local_zfs', 'nvmeof_tcp');

-- AlterTable: nodes — add multi-node orchestration ports and storage headroom
ALTER TABLE "nodes"
  ADD COLUMN "session_orchestration_port" INTEGER NOT NULL DEFAULT 9998,
  ADD COLUMN "storage_provision_port"     INTEGER NOT NULL DEFAULT 9999,
  ADD COLUMN "nvme_of_port"              INTEGER NOT NULL DEFAULT 4420,
  ADD COLUMN "storage_headroom_gb"       INTEGER NOT NULL DEFAULT 15;

-- AlterTable: user_storage_volumes — add node association and storage backend
ALTER TABLE "user_storage_volumes"
  ADD COLUMN "node_id"          UUID,
  ADD COLUMN "storage_backend"  "StorageBackend" NOT NULL DEFAULT 'zfs_dataset';

-- AlterTable: sessions — add storage node tracking
ALTER TABLE "sessions"
  ADD COLUMN "storage_node_id"    UUID,
  ADD COLUMN "storage_transport"  "StorageTransport";

-- Backfill: set nodeId on existing UserStorageVolume records to the first node
UPDATE "user_storage_volumes"
SET "node_id" = (SELECT "id" FROM "nodes" ORDER BY "created_at" ASC LIMIT 1)
WHERE "node_id" IS NULL;

-- AddForeignKey: user_storage_volumes.node_id -> nodes.id
ALTER TABLE "user_storage_volumes"
  ADD CONSTRAINT "user_storage_volumes_node_id_fkey"
  FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: sessions.storage_node_id -> nodes.id
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_storage_node_id_fkey"
  FOREIGN KEY ("storage_node_id") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex: user_storage_volumes.node_id
CREATE INDEX "user_storage_volumes_node_id_idx" ON "user_storage_volumes"("node_id");

-- CreateIndex: sessions.storage_node_id
CREATE INDEX "sessions_storage_node_id_idx" ON "sessions"("storage_node_id");
