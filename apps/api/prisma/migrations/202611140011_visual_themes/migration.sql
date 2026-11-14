-- Visual theme preference: surfaces and decorative backdrop, independent from the accent.
ALTER TABLE "UserPreference" ADD COLUMN "visualTheme" TEXT NOT NULL DEFAULT 'classic';
