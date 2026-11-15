-- Vertical covers and banners found when a work page is enriched.
ALTER TABLE "MediaItem" ADD COLUMN "posterUrl" TEXT;
ALTER TABLE "MediaItem" ADD COLUMN "posterAttribution" JSONB;
ALTER TABLE "MediaItem" ADD COLUMN "bannerUrl" TEXT;
