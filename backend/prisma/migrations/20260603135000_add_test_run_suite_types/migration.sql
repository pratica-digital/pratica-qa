CREATE TYPE "TestRunTestType" AS ENUM ('SMOKE', 'FUNCIONAL', 'REGRESSAO', 'ROBUSTEZ');

ALTER TABLE "test_run_suites"
ADD COLUMN "testType" "TestRunTestType" NOT NULL DEFAULT 'FUNCIONAL';

CREATE INDEX "test_run_suites_testType_idx" ON "test_run_suites"("testType");
