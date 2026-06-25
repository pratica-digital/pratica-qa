ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "lastModifiedById" UUID;

CREATE TABLE IF NOT EXISTS "test_result_history" (
  "id" UUID NOT NULL,
  "testResultId" UUID NOT NULL,
  "actorUserId" UUID,
  "previousStatus" "TestResultStatus",
  "newStatus" "TestResultStatus",
  "previousComment" TEXT NOT NULL DEFAULT '',
  "newComment" TEXT NOT NULL DEFAULT '',
  "addedAttachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "removedAttachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "test_result_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "test_results_lastModifiedById_idx" ON "test_results"("lastModifiedById");
CREATE INDEX IF NOT EXISTS "test_result_history_testResultId_idx" ON "test_result_history"("testResultId");
CREATE INDEX IF NOT EXISTS "test_result_history_actorUserId_idx" ON "test_result_history"("actorUserId");
CREATE INDEX IF NOT EXISTS "test_result_history_createdAt_idx" ON "test_result_history"("createdAt");

ALTER TABLE "test_results"
  ADD CONSTRAINT "test_results_lastModifiedById_fkey"
  FOREIGN KEY ("lastModifiedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "test_result_history"
  ADD CONSTRAINT "test_result_history_testResultId_fkey"
  FOREIGN KEY ("testResultId") REFERENCES "test_results"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_result_history"
  ADD CONSTRAINT "test_result_history_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
