ALTER TABLE "test_cases" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "test_results" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH ranked_cases AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY "suiteId"
      ORDER BY "createdAt" ASC, id ASC
    ))::INTEGER AS position
  FROM "test_cases"
)
UPDATE "test_cases" AS test_case
SET "position" = ranked_cases.position
FROM ranked_cases
WHERE test_case.id = ranked_cases.id;

WITH ranked_results AS (
  SELECT
    test_result.id,
    (ROW_NUMBER() OVER (
      PARTITION BY test_result."testRunId"
      ORDER BY
        COALESCE(run_suite.position, 2147483647) ASC,
        test_case.position ASC,
        test_result."createdAt" ASC,
        test_result.id ASC
    ))::INTEGER AS position
  FROM "test_results" AS test_result
  INNER JOIN "test_cases" AS test_case ON test_case.id = test_result."testCaseId"
  LEFT JOIN "test_run_suites" AS run_suite
    ON run_suite."testRunId" = test_result."testRunId"
    AND run_suite."testSuiteId" = test_case."suiteId"
)
UPDATE "test_results" AS test_result
SET "position" = ranked_results.position
FROM ranked_results
WHERE test_result.id = ranked_results.id;

CREATE INDEX "test_cases_suiteId_position_idx" ON "test_cases"("suiteId", "position");
CREATE INDEX "test_results_testRunId_position_idx" ON "test_results"("testRunId", "position");
