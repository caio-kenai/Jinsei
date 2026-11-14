-- Saved views belong to a scope (a category, the whole library or favorites) and can be many.
ALTER TABLE "SavedView" DROP CONSTRAINT "SavedView_mediaTypeId_fkey";
DROP INDEX "SavedView_userId_mediaTypeId_key";
ALTER TABLE "SavedView" ADD COLUMN "scope" TEXT,
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
UPDATE "SavedView" SET "scope" = "mediaTypeId";
ALTER TABLE "SavedView" ALTER COLUMN "scope" SET NOT NULL;
ALTER TABLE "SavedView" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "SavedView" DROP COLUMN "mediaTypeId";

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_userId_scope_name_key" ON "SavedView"("userId", "scope", "name");

-- CreateIndex
CREATE INDEX "SavedView_userId_scope_position_idx" ON "SavedView"("userId", "scope", "position");

ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_scope_check" CHECK ("scope" IN ('games', 'anime', 'manga', 'movies', 'series', 'books', 'library', 'favorites'));
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_position_check" CHECK ("position" BETWEEN 0 AND 1000);
