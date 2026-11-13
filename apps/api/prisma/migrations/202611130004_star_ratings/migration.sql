-- Existing 0..20 integer steps preserve the exact relative score:
-- legacy 9.5/10 (19 steps) becomes 4.75/5 (19 quarter-star steps).
COMMENT ON COLUMN "UserMediaEntry"."ratingSteps" IS 'Quarter-star steps: 0..20 represents 0..5 stars; NULL means unrated';
UPDATE "ActivityLog"
SET "changes" = jsonb_set("changes", '{rating}', to_jsonb(("changes"->>'rating')::numeric / 2))
WHERE jsonb_typeof("changes"->'rating') = 'number';
