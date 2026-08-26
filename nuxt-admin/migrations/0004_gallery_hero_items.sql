-- Artwork Hero is intentionally independent from galleries so its image URLs
-- and ordering never alter the public masonry timeline.
CREATE TABLE IF NOT EXISTS gallery_hero_items (
  id INTEGER PRIMARY KEY,
  section TEXT NOT NULL CHECK (section IN ('fade', 'accordion', 'coverflow', 'preview')),
  image_url TEXT NOT NULL,
  image_asset_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (image_asset_id) REFERENCES image_assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gallery_hero_items_section_sort
  ON gallery_hero_items(section, sort_order, id);
