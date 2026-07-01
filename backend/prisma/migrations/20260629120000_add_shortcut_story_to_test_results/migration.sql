ALTER TABLE "test_results"
ADD COLUMN "shortcutStoryId" TEXT,
ADD COLUMN "shortcutStoryUrl" TEXT;

CREATE INDEX "test_results_shortcutStoryId_idx" ON "test_results"("shortcutStoryId");
