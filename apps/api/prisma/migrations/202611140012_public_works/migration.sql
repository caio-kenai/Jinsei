-- Public work pages: recommendation on reviews and cached catalog details.
ALTER TABLE "UserMediaEntry" ADD COLUMN "recommendation" TEXT;

CREATE TABLE "MediaDetail" (
    "mediaId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaDetail_pkey" PRIMARY KEY ("mediaId")
);

CREATE INDEX "UserMediaEntry_mediaId_reviewPublic_idx" ON "UserMediaEntry"("mediaId", "reviewPublic");
CREATE INDEX "UserMediaEntry_mediaId_ratingSteps_idx" ON "UserMediaEntry"("mediaId", "ratingSteps");

ALTER TABLE "MediaDetail" ADD CONSTRAINT "MediaDetail_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
