-- Preserve legacy generations whose creator no longer exists before adding the FK.
UPDATE "ai_generations" AS generation
SET "createdById" = NULL
WHERE "createdById" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "users" AS creator
    WHERE creator."id" = generation."createdById"
  );

CREATE INDEX "ai_generations_createdById_idx" ON "ai_generations"("createdById");

ALTER TABLE "ai_generations"
ADD CONSTRAINT "ai_generations_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
