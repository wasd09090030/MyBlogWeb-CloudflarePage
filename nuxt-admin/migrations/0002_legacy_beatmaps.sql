-- Historical-only tables. No active route is required after Beatmap API retirement.

CREATE TABLE IF NOT EXISTS beatmap_sets (
  id INTEGER PRIMARY KEY,
  storage_key TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  creator TEXT NOT NULL,
  background_file TEXT,
  audio_file TEXT,
  preview_time INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS beatmap_difficulties (
  id INTEGER PRIMARY KEY,
  beatmap_set_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  mode INTEGER NOT NULL,
  columns INTEGER NOT NULL,
  overall_difficulty REAL NOT NULL,
  bpm REAL,
  osu_file_name TEXT NOT NULL,
  data_json TEXT NOT NULL,
  note_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (beatmap_set_id) REFERENCES beatmap_sets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_beatmap_difficulties_set_id ON beatmap_difficulties(beatmap_set_id);
