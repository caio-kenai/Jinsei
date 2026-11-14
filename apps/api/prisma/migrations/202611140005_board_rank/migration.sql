-- AlterTable
ALTER TABLE "UserMediaEntry" ADD COLUMN "boardRank" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "UserMediaEntry_userId_statusId_boardRank_idx" ON "UserMediaEntry"("userId", "statusId", "boardRank");
