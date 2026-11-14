-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "activeTitle" TEXT;

-- CreateTable
CREATE TABLE "XpAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "StreakDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "StreakDay_pkey" PRIMARY KEY ("userId","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "XpAward_userId_key_key" ON "XpAward"("userId", "key");

-- AddForeignKey
ALTER TABLE "XpAward" ADD CONSTRAINT "XpAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakDay" ADD CONSTRAINT "StreakDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "XpAward" ADD CONSTRAINT "XpAward_amount_check" CHECK ("amount" BETWEEN 0 AND 10000);
