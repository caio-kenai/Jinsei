-- AlterTable
ALTER TABLE "UserMediaEntry" ADD COLUMN "startedOn" DATE,
ADD COLUMN "completedOn" DATE;

-- Existing entries receive the best dates already known: completion at the last update and start
-- at the moment the title was added.
UPDATE "UserMediaEntry" e SET "completedOn" = e."updatedAt"::date
FROM "UserStatus" s WHERE s."id" = e."statusId" AND s."key" = 'completed';
UPDATE "UserMediaEntry" e SET "startedOn" = e."createdAt"::date
FROM "UserStatus" s WHERE s."id" = e."statusId" AND s."key" IN ('in_progress', 'paused', 'completed', 'dropped');

CREATE INDEX "UserMediaEntry_userId_completedOn_idx" ON "UserMediaEntry"("userId", "completedOn");
CREATE INDEX "UserMediaEntry_userId_startedOn_idx" ON "UserMediaEntry"("userId", "startedOn");
ALTER TABLE "UserMediaEntry" ADD CONSTRAINT "UserMediaEntry_dates_check" CHECK (("startedOn" IS NULL OR "startedOn" >= DATE '1900-01-01') AND ("completedOn" IS NULL OR "completedOn" >= DATE '1900-01-01'));
