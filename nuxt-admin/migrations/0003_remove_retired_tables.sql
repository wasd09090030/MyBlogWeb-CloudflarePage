-- Retire tables that were created by earlier migration history but are not
-- part of the Free-plan blog-api runtime.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS beatmap_difficulties;
DROP TABLE IF EXISTS beatmap_sets;
DROP TABLE IF EXISTS cf_image_configs;

PRAGMA foreign_keys = ON;
