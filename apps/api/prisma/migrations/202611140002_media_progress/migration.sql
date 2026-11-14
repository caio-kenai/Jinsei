-- CreateTable
CREATE TABLE "SeriesMetadata" (
    "mediaId" TEXT NOT NULL,
    "studios" TEXT[],
    "totalEpisodes" INTEGER,
    "totalSeasons" INTEGER,
    "releaseStatus" TEXT NOT NULL DEFAULT 'unknown',

    CONSTRAINT "SeriesMetadata_pkey" PRIMARY KEY ("mediaId")
);

-- CreateTable
CREATE TABLE "SeriesSeason" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "episodes" INTEGER,

    CONSTRAINT "SeriesSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingMetadata" (
    "mediaId" TEXT NOT NULL,
    "authors" TEXT[],
    "publishers" TEXT[],
    "totalChapters" INTEGER,
    "totalVolumes" INTEGER,
    "totalPages" INTEGER,
    "releaseStatus" TEXT NOT NULL DEFAULT 'unknown',

    CONSTRAINT "ReadingMetadata_pkey" PRIMARY KEY ("mediaId")
);

-- CreateTable
CREATE TABLE "MovieMetadata" (
    "mediaId" TEXT NOT NULL,
    "directors" TEXT[],
    "runtimeMinutes" INTEGER,

    CONSTRAINT "MovieMetadata_pkey" PRIMARY KEY ("mediaId")
);

-- CreateTable
CREATE TABLE "EpisodeProgress" (
    "entryId" TEXT NOT NULL,
    "episodesWatched" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EpisodeProgress_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "entryId" TEXT NOT NULL,
    "chaptersRead" INTEGER NOT NULL DEFAULT 0,
    "volumesRead" INTEGER NOT NULL DEFAULT 0,
    "pagesRead" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "EntryViewing" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "watchedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryViewing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeriesSeason_mediaId_number_key" ON "SeriesSeason"("mediaId", "number");

-- CreateIndex
CREATE INDEX "EntryViewing_entryId_watchedOn_idx" ON "EntryViewing"("entryId", "watchedOn");

-- AddForeignKey
ALTER TABLE "SeriesMetadata" ADD CONSTRAINT "SeriesMetadata_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesSeason" ADD CONSTRAINT "SeriesSeason_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "SeriesMetadata"("mediaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingMetadata" ADD CONSTRAINT "ReadingMetadata_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieMetadata" ADD CONSTRAINT "MovieMetadata_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeProgress" ADD CONSTRAINT "EpisodeProgress_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "UserMediaEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "UserMediaEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryViewing" ADD CONSTRAINT "EntryViewing_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "UserMediaEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeriesMetadata" ADD CONSTRAINT "SeriesMetadata_totals_check" CHECK (("totalEpisodes" IS NULL OR "totalEpisodes" BETWEEN 1 AND 100000) AND ("totalSeasons" IS NULL OR "totalSeasons" BETWEEN 1 AND 1000));
ALTER TABLE "SeriesMetadata" ADD CONSTRAINT "SeriesMetadata_release_check" CHECK ("releaseStatus" IN ('upcoming', 'releasing', 'finished', 'unknown'));
ALTER TABLE "SeriesSeason" ADD CONSTRAINT "SeriesSeason_values_check" CHECK ("number" BETWEEN 0 AND 1000 AND ("episodes" IS NULL OR "episodes" BETWEEN 1 AND 10000));
ALTER TABLE "ReadingMetadata" ADD CONSTRAINT "ReadingMetadata_totals_check" CHECK (("totalChapters" IS NULL OR "totalChapters" BETWEEN 1 AND 100000) AND ("totalVolumes" IS NULL OR "totalVolumes" BETWEEN 1 AND 10000) AND ("totalPages" IS NULL OR "totalPages" BETWEEN 1 AND 100000));
ALTER TABLE "ReadingMetadata" ADD CONSTRAINT "ReadingMetadata_release_check" CHECK ("releaseStatus" IN ('upcoming', 'releasing', 'finished', 'unknown'));
ALTER TABLE "MovieMetadata" ADD CONSTRAINT "MovieMetadata_runtime_check" CHECK ("runtimeMinutes" IS NULL OR "runtimeMinutes" BETWEEN 1 AND 2000);
ALTER TABLE "EpisodeProgress" ADD CONSTRAINT "EpisodeProgress_watched_check" CHECK ("episodesWatched" BETWEEN 0 AND 100000);
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_read_check" CHECK ("chaptersRead" BETWEEN 0 AND 100000 AND "volumesRead" BETWEEN 0 AND 10000 AND "pagesRead" BETWEEN 0 AND 100000);
ALTER TABLE "EntryViewing" ADD CONSTRAINT "EntryViewing_date_check" CHECK ("watchedOn" >= DATE '1900-01-01');

-- Books are a native category. Existing accounts receive its default statuses; enabling it stays optional.
INSERT INTO "MediaType" ("id", "label", "sortOrder") VALUES ('books', 'Livros', 5);
INSERT INTO "UserStatus" ("id", "userId", "mediaTypeId", "key", "label", "color", "sortOrder")
SELECT gen_random_uuid()::text, u."id", 'books', s."key", s."label", s."color", s."sortOrder"
FROM "User" u
CROSS JOIN (VALUES
  ('planned', 'Planejado', 'slate', 0),
  ('in_progress', 'Em andamento', 'violet', 1),
  ('paused', 'Pausado', 'amber', 2),
  ('completed', 'Concluído', 'emerald', 3),
  ('dropped', 'Abandonado', 'rose', 4)
) AS s("key", "label", "color", "sortOrder")
ON CONFLICT ("userId", "mediaTypeId", "key") DO NOTHING;
