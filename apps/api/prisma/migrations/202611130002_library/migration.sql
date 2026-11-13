-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "mediaTypeId" TEXT NOT NULL,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "releaseYear" INTEGER,
    "coverUrl" TEXT,
    "genres" TEXT[],
    "attributionLabel" TEXT NOT NULL,
    "attributionUrl" TEXT,
    "dataLicense" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMetadata" (
    "mediaId" TEXT NOT NULL,
    "platforms" TEXT[],
    "developers" TEXT[],
    "publishers" TEXT[],

    CONSTRAINT "GameMetadata_pkey" PRIMARY KEY ("mediaId")
);

-- CreateTable
CREATE TABLE "MediaExternalId" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "synchronizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionPolicy" TEXT NOT NULL,

    CONSTRAINT "MediaExternalId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMediaEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "ratingSteps" INTEGER,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMediaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameProgress" (
    "entryId" TEXT NOT NULL,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "completion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GameProgress_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'violet',

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryTag" (
    "entryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "EntryTag_pkey" PRIMARY KEY ("entryId","tagId")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Minha visualização',
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaItem_mediaTypeId_title_idx" ON "MediaItem"("mediaTypeId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "MediaItem_ownerId_mediaTypeId_normalizedTitle_key" ON "MediaItem"("ownerId", "mediaTypeId", "normalizedTitle");

-- CreateIndex
CREATE UNIQUE INDEX "MediaExternalId_provider_externalId_key" ON "MediaExternalId"("provider", "externalId");

-- CreateIndex
CREATE INDEX "UserMediaEntry_userId_updatedAt_idx" ON "UserMediaEntry"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "UserMediaEntry_userId_statusId_idx" ON "UserMediaEntry"("userId", "statusId");

-- CreateIndex
CREATE INDEX "UserMediaEntry_userId_favorite_idx" ON "UserMediaEntry"("userId", "favorite");

-- CreateIndex
CREATE UNIQUE INDEX "UserMediaEntry_userId_mediaId_key" ON "UserMediaEntry"("userId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_normalizedName_key" ON "Tag"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_userId_mediaTypeId_key" ON "SavedView"("userId", "mediaTypeId");

-- AddForeignKey
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_mediaTypeId_fkey" FOREIGN KEY ("mediaTypeId") REFERENCES "MediaType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMetadata" ADD CONSTRAINT "GameMetadata_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaExternalId" ADD CONSTRAINT "MediaExternalId_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaEntry" ADD CONSTRAINT "UserMediaEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaEntry" ADD CONSTRAINT "UserMediaEntry_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaEntry" ADD CONSTRAINT "UserMediaEntry_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "UserStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameProgress" ADD CONSTRAINT "GameProgress_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "UserMediaEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryTag" ADD CONSTRAINT "EntryTag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "UserMediaEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryTag" ADD CONSTRAINT "EntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "UserMediaEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_mediaTypeId_fkey" FOREIGN KEY ("mediaTypeId") REFERENCES "MediaType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserMediaEntry" ADD CONSTRAINT "UserMediaEntry_rating_check" CHECK ("ratingSteps" IS NULL OR "ratingSteps" BETWEEN 0 AND 20);
ALTER TABLE "GameProgress" ADD CONSTRAINT "GameProgress_minutes_check" CHECK ("minutesPlayed" BETWEEN 0 AND 6000000);
ALTER TABLE "GameProgress" ADD CONSTRAINT "GameProgress_completion_check" CHECK ("completion" BETWEEN 0 AND 100);
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_year_check" CHECK ("releaseYear" IS NULL OR "releaseYear" BETWEEN 1900 AND 2100);
