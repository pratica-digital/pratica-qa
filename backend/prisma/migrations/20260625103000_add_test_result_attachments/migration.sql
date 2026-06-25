CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "test_result_attachments" (
  "id" UUID NOT NULL,
  "testResultId" UUID NOT NULL,
  "testRunId" UUID NOT NULL,
  "testCaseId" UUID NOT NULL,
  "testStepId" UUID,
  "uploadedById" UUID,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL DEFAULT 0,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "test_result_attachments_pkey" PRIMARY KEY ("id")
);

INSERT INTO "test_result_attachments" (
  "id",
  "testResultId",
  "testRunId",
  "testCaseId",
  "uploadedById",
  "fileName",
  "originalName",
  "mimeType",
  "size",
  "url",
  "createdAt"
)
SELECT
  gen_random_uuid(),
  tr."id",
  tr."testRunId",
  tr."testCaseId",
  COALESCE(tr."lastModifiedById", tr."executedById"),
  regexp_replace(attachment_url, '^.*/', ''),
  regexp_replace(attachment_url, '^.*/', ''),
  'application/octet-stream',
  0,
  attachment_url,
  COALESCE(tr."updatedAt", tr."createdAt")
FROM "test_results" tr
CROSS JOIN LATERAL unnest(COALESCE(tr."attachments", ARRAY[]::TEXT[])) AS attachment_url
WHERE attachment_url <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "test_result_attachments" existing
    WHERE existing."testResultId" = tr."id"
      AND existing."url" = attachment_url
  );

CREATE INDEX IF NOT EXISTS "test_result_attachments_testResultId_idx" ON "test_result_attachments"("testResultId");
CREATE INDEX IF NOT EXISTS "test_result_attachments_testRunId_idx" ON "test_result_attachments"("testRunId");
CREATE INDEX IF NOT EXISTS "test_result_attachments_testCaseId_idx" ON "test_result_attachments"("testCaseId");
CREATE INDEX IF NOT EXISTS "test_result_attachments_testStepId_idx" ON "test_result_attachments"("testStepId");
CREATE INDEX IF NOT EXISTS "test_result_attachments_uploadedById_idx" ON "test_result_attachments"("uploadedById");
CREATE INDEX IF NOT EXISTS "test_result_attachments_createdAt_idx" ON "test_result_attachments"("createdAt");

ALTER TABLE "test_result_attachments"
  ADD CONSTRAINT "test_result_attachments_testResultId_fkey"
  FOREIGN KEY ("testResultId") REFERENCES "test_results"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_result_attachments"
  ADD CONSTRAINT "test_result_attachments_testRunId_fkey"
  FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_result_attachments"
  ADD CONSTRAINT "test_result_attachments_testCaseId_fkey"
  FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_result_attachments"
  ADD CONSTRAINT "test_result_attachments_testStepId_fkey"
  FOREIGN KEY ("testStepId") REFERENCES "test_steps"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "test_result_attachments"
  ADD CONSTRAINT "test_result_attachments_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
