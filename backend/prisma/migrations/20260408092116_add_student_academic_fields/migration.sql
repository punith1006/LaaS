-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "academic_year" INTEGER,
ADD COLUMN     "course_name" TEXT,
ADD COLUMN     "department_id" UUID;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
