ALTER TABLE "MediaItem" ADD COLUMN "coverAttribution" JSONB;
ALTER TABLE "UserPreference" ALTER COLUMN "accent" SET DEFAULT 'black';
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_accent_check";
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_accent_check" CHECK ("accent" IN ('black', 'rose', 'violet', 'blue', 'emerald', 'pink', 'indigo', 'orange', 'teal', 'bronze'));
