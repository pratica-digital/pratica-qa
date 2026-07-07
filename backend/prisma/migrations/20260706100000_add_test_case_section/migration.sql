ALTER TABLE "test_cases" ADD COLUMN "section" TEXT NOT NULL DEFAULT '';

CREATE INDEX "test_cases_suiteId_section_idx" ON "test_cases"("suiteId", "section");
