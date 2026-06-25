ALTER TABLE "test_suites" DROP COLUMN IF EXISTS "description";
ALTER TABLE "test_suites" DROP COLUMN IF EXISTS "status";
DROP TYPE IF EXISTS "TestSuiteStatus";
