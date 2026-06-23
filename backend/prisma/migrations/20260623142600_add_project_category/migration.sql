-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('BAKERY_OVENS', 'COMBI_OVENS', 'SPEED_OVENS');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "category" "ProjectCategory" NOT NULL DEFAULT 'BAKERY_OVENS';
