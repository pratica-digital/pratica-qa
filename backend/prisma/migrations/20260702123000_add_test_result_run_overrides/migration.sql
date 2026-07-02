-- Add per-run overrides for test cases inside a test execution.
ALTER TABLE "test_results"
  ADD COLUMN "titleOverride" TEXT,
  ADD COLUMN "descriptionOverride" TEXT,
  ADD COLUMN "expectedResultOverride" TEXT,
  ADD COLUMN "stepsOverride" JSONB,
  ADD COLUMN "removedAt" TIMESTAMP(3);

CREATE INDEX "test_results_removedAt_idx" ON "test_results"("removedAt");
