CREATE TABLE "ai_generations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "releaseTitle" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "releaseHash" TEXT NOT NULL,
    "releaseText" TEXT NOT NULL,
    "analysis" JSONB NOT NULL DEFAULT '{}',
    "testCases" JSONB NOT NULL DEFAULT '[]',
    "regressionSuite" JSONB NOT NULL DEFAULT '[]',
    "coverage" JSONB NOT NULL DEFAULT '{}',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "durationMs" INTEGER,
    "casesCreated" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_configurations" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT '',
    "temperature" DOUBLE PRECISION NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "timeoutSeconds" INTEGER NOT NULL,
    "retries" INTEGER NOT NULL,
    "streaming" BOOLEAN NOT NULL DEFAULT false,
    "promptBase" TEXT NOT NULL,
    "promptUser" TEXT NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_configurations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_generations_releaseHash_idx" ON "ai_generations"("releaseHash");
CREATE INDEX "ai_generations_provider_model_idx" ON "ai_generations"("provider", "model");
CREATE INDEX "ai_generations_status_idx" ON "ai_generations"("status");
CREATE INDEX "ai_generations_createdAt_idx" ON "ai_generations"("createdAt");
