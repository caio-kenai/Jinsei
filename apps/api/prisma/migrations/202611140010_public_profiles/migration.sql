-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "showFavorites" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showStatistics" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showReviews" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showHistory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showGoals" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserMediaEntry" ADD COLUMN "review" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reviewPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProfileLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProfileLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileLink_userId_position_idx" ON "ProfileLink"("userId", "position");

-- CreateIndex
CREATE INDEX "UserMediaEntry_userId_reviewPublic_idx" ON "UserMediaEntry"("userId", "reviewPublic");

-- AddForeignKey
ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_url_check" CHECK ("url" LIKE 'https://%');
