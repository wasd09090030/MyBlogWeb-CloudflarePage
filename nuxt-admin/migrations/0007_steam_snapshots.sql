-- Steam snapshot storage: sync writes normalized rows, the public page only reads.
CREATE TABLE IF NOT EXISTS steam_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  steamid TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  avatar_url TEXT,
  profile_url TEXT,
  level INTEGER,
  game_count INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  minutes_2weeks INTEGER NOT NULL DEFAULT 0,
  achievements_unlocked INTEGER NOT NULL DEFAULT 0,
  achievements_total INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'unknown',
  synced_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS steam_games (
  appid INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  header_url TEXT,
  icon_url TEXT,
  minutes_total INTEGER NOT NULL DEFAULT 0,
  minutes_2weeks INTEGER NOT NULL DEFAULT 0,
  minutes_deck INTEGER NOT NULL DEFAULT 0,
  last_played_at TEXT,
  release_date TEXT,
  genres TEXT,
  is_free INTEGER,
  achievements_total INTEGER,
  achievements_unlocked INTEGER,
  achievement_synced_at TEXT,
  is_visible INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_steam_games_minutes ON steam_games(minutes_total DESC);
CREATE INDEX IF NOT EXISTS idx_steam_games_visible ON steam_games(is_visible);

CREATE TABLE IF NOT EXISTS steam_achievements (
  appid INTEGER NOT NULL,
  api_name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  icon_url TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  global_percent REAL,
  achieved INTEGER NOT NULL DEFAULT 0,
  unlocked_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (appid, api_name)
);

CREATE INDEX IF NOT EXISTS idx_steam_achievements_app ON steam_achievements(appid, achieved);
CREATE INDEX IF NOT EXISTS idx_steam_achievements_rarity ON steam_achievements(achieved, global_percent);

CREATE TABLE IF NOT EXISTS steam_sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  trigger TEXT NOT NULL,
  api_calls INTEGER NOT NULL DEFAULT 0,
  games_upserted INTEGER NOT NULL DEFAULT 0,
  achievements_upserted INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_steam_sync_runs_started ON steam_sync_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS steam_sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Wishlist needs a name and cover that the wishlist endpoint does not return,
-- so resolved store metadata is cached here instead of re-requested every run.
CREATE TABLE IF NOT EXISTS steam_wishlist (
  appid INTEGER PRIMARY KEY,
  date_added INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  header_url TEXT,
  resolved_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_steam_wishlist_position ON steam_wishlist(position);

-- Showcase layout mirrors Steam profile showcases; order is explicit, so no unique position index.
CREATE TABLE IF NOT EXISTS steam_showcases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  position INTEGER NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1,
  config TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_steam_showcases_position ON steam_showcases(position);

INSERT INTO steam_showcases (type, position, visible, config, updated_at) VALUES
  ('favorite', 1, 1, '{}', '2026-10-31T00:00:00.000Z'),
  ('collector', 2, 1, '{}', '2026-10-31T00:00:00.000Z'),
  ('recent', 3, 1, '{}', '2026-10-31T00:00:00.000Z'),
  ('top-playtime', 4, 1, '{"limit":6}', '2026-10-31T00:00:00.000Z'),
  ('completionist', 5, 1, '{}', '2026-10-31T00:00:00.000Z'),
  ('rarest-achievement', 6, 1, '{"limit":3}', '2026-10-31T00:00:00.000Z'),
  ('wishlist', 7, 1, '{}', '2026-10-31T00:00:00.000Z');
