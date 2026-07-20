-- CreateTable
CREATE TABLE "_ProjectTestSuites" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ProjectTestSuites_AB_pkey" PRIMARY KEY ("A", "B")
);

-- Preserve every existing suite-to-project relationship.
INSERT INTO "_ProjectTestSuites" ("A", "B")
SELECT "projectId", "id"
FROM "test_suites"
WHERE "projectId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "_ProjectTestSuites_B_index" ON "_ProjectTestSuites"("B");

-- DropForeignKey
ALTER TABLE "test_suites" DROP CONSTRAINT "test_suites_projectId_fkey";

-- DropIndex
DROP INDEX "test_suites_projectId_idx";

-- DropIndex
DROP INDEX "test_suites_projectId_name_key";

-- AlterTable
ALTER TABLE "test_suites" DROP COLUMN "projectId";

-- AddForeignKey
ALTER TABLE "_ProjectTestSuites" ADD CONSTRAINT "_ProjectTestSuites_A_fkey" FOREIGN KEY ("A") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectTestSuites" ADD CONSTRAINT "_ProjectTestSuites_B_fkey" FOREIGN KEY ("B") REFERENCES "test_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
