-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestSuiteStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestCaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TestSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED');

-- CreateEnum
CREATE TYPE "TestResultStatus" AS ENUM ('NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_suites" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "TestSuiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "test_suites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" UUID NOT NULL,
    "suiteId" UUID NOT NULL,
    "clonedFromId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "preconditions" TEXT NOT NULL DEFAULT '',
    "expectedResult" TEXT NOT NULL DEFAULT '',
    "status" "TestCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "TestPriority" NOT NULL DEFAULT 'MEDIUM',
    "severity" "TestSeverity" NOT NULL DEFAULT 'MEDIUM',
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_steps" (
    "id" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "test_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_runs" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "suiteId" UUID,
    "createdById" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "TestRunStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" UUID NOT NULL,
    "testRunId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "executedById" UUID,
    "status" "TestResultStatus" NOT NULL DEFAULT 'NOT_RUN',
    "notes" TEXT NOT NULL DEFAULT '',
    "actualResult" TEXT NOT NULL DEFAULT '',
    "defectReference" TEXT NOT NULL DEFAULT '',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirements" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "referenceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RequirementToTestCase" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_RequirementToTestCase_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_key_key" ON "projects"("key");

-- CreateIndex
CREATE INDEX "projects_deletedAt_idx" ON "projects"("deletedAt");

-- CreateIndex
CREATE INDEX "test_suites_projectId_idx" ON "test_suites"("projectId");

-- CreateIndex
CREATE INDEX "test_suites_deletedAt_idx" ON "test_suites"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "test_suites_projectId_name_key" ON "test_suites"("projectId", "name");

-- CreateIndex
CREATE INDEX "test_cases_suiteId_idx" ON "test_cases"("suiteId");

-- CreateIndex
CREATE INDEX "test_cases_status_idx" ON "test_cases"("status");

-- CreateIndex
CREATE INDEX "test_cases_priority_idx" ON "test_cases"("priority");

-- CreateIndex
CREATE INDEX "test_cases_deletedAt_idx" ON "test_cases"("deletedAt");

-- CreateIndex
CREATE INDEX "test_steps_testCaseId_idx" ON "test_steps"("testCaseId");

-- CreateIndex
CREATE INDEX "test_steps_deletedAt_idx" ON "test_steps"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "test_steps_testCaseId_position_key" ON "test_steps"("testCaseId", "position");

-- CreateIndex
CREATE INDEX "test_runs_projectId_idx" ON "test_runs"("projectId");

-- CreateIndex
CREATE INDEX "test_runs_suiteId_idx" ON "test_runs"("suiteId");

-- CreateIndex
CREATE INDEX "test_runs_status_idx" ON "test_runs"("status");

-- CreateIndex
CREATE INDEX "test_results_testCaseId_idx" ON "test_results"("testCaseId");

-- CreateIndex
CREATE INDEX "test_results_status_idx" ON "test_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "test_results_testRunId_testCaseId_key" ON "test_results"("testRunId", "testCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "requirements_projectId_idx" ON "requirements"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "requirements_projectId_referenceKey_key" ON "requirements"("projectId", "referenceKey");

-- CreateIndex
CREATE INDEX "_RequirementToTestCase_B_index" ON "_RequirementToTestCase"("B");

-- AddForeignKey
ALTER TABLE "test_suites" ADD CONSTRAINT "test_suites_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "test_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_steps" ADD CONSTRAINT "test_steps_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "test_suites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequirementToTestCase" ADD CONSTRAINT "_RequirementToTestCase_A_fkey" FOREIGN KEY ("A") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequirementToTestCase" ADD CONSTRAINT "_RequirementToTestCase_B_fkey" FOREIGN KEY ("B") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
