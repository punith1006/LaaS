/*
  Warnings:

  - A unique constraint covering the columns `[user_id,name]` on the table `user_storage_volumes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `user_storage_volumes` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add column as nullable first
ALTER TABLE "user_storage_volumes" ADD COLUMN "name" VARCHAR(128);

-- Step 2: Populate existing rows with a default name derived from storage_uid
UPDATE "user_storage_volumes" SET "name" = 'storage-' || SUBSTR("storage_uid", 3, 8) WHERE "name" IS NULL;

-- Step 3: Set NOT NULL constraint
ALTER TABLE "user_storage_volumes" ALTER COLUMN "name" SET NOT NULL;

-- Step 4: Set default value for future inserts
ALTER TABLE "user_storage_volumes" ALTER COLUMN "name" SET DEFAULT ('storage-' || SUBSTR(gen_random_uuid()::text, 1, 8));

-- CreateIndex
CREATE UNIQUE INDEX "user_storage_volumes_user_id_name_key" ON "user_storage_volumes"("user_id", "name");
