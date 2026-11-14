-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "metric" TEXT NOT NULL,
    "mediaTypeId" TEXT,
    "collectionId" TEXT,
    "target" INTEGER NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT,
    "mediaTypeId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "occurredOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_userId_archived_idx" ON "Goal"("userId", "archived");

-- CreateIndex
CREATE INDEX "ProgressLog_userId_metric_occurredOn_idx" ON "ProgressLog"("userId", "metric", "occurredOn");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressLog" ADD CONSTRAINT "ProgressLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressLog" ADD CONSTRAINT "ProgressLog_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "UserMediaEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_metric_check" CHECK ("metric" IN ('titles_completed', 'titles_started', 'episodes_watched', 'chapters_read', 'pages_read', 'hours_played', 'movies_watched', 'collection_completed'));
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_target_check" CHECK ("target" BETWEEN 1 AND 1000000);
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_period_check" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn");
ALTER TABLE "ProgressLog" ADD CONSTRAINT "ProgressLog_metric_check" CHECK ("metric" IN ('episodes', 'chapters', 'volumes', 'pages', 'minutes'));
