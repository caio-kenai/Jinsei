-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userAgent" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "celebrations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
ADD COLUMN     "timeFormat" TEXT NOT NULL DEFAULT '24h';

