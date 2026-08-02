-- Active blog schema for Cloudflare D1.
-- IDs and object keys intentionally match the existing SQLite database.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  content_markdown TEXT,
  cover_image TEXT,
  cover_image_asset_id INTEGER,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('study', 'game', 'work', 'resource', 'other')),
  tags TEXT NOT NULL DEFAULT '[]',
  ai_summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cover_image_asset_id) REFERENCES image_assets(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category_created_at ON articles(category, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  email TEXT,
  website TEXT,
  article_id INTEGER NOT NULL,
  parent_id INTEGER,
  likes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  user_ip TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_article_status_created_at ON comments(article_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_status_created_at ON comments(status, created_at DESC);

CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY,
  article_id INTEGER NOT NULL,
  user_identifier TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'article',
  target_id INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_unique_target ON likes(article_id, user_identifier, type, target_id);

CREATE TABLE IF NOT EXISTS image_assets (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  source_url TEXT,
  content_type TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  kind TEXT NOT NULL DEFAULT 'other',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_assets_public_id ON image_assets(public_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_storage_key ON image_assets(storage_key);

CREATE TABLE IF NOT EXISTS galleries (
  id INTEGER PRIMARY KEY,
  image_url TEXT NOT NULL,
  image_asset_id INTEGER,
  image_width INTEGER,
  image_height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  tag TEXT NOT NULL DEFAULT 'artwork',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (image_asset_id) REFERENCES image_assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_galleries_active_sort_order ON galleries(is_active, sort_order, id);

-- This table deliberately excludes the old provider API token.
CREATE TABLE IF NOT EXISTS imagebed_configs (
  id INTEGER PRIMARY KEY,
  domain TEXT NOT NULL,
  upload_folder TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cf_image_configs (
  id INTEGER PRIMARY KEY,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  zone_domain TEXT,
  use_https INTEGER NOT NULL DEFAULT 1,
  fit TEXT NOT NULL DEFAULT 'scale-down',
  width INTEGER NOT NULL DEFAULT 300,
  quality INTEGER NOT NULL DEFAULT 50,
  format TEXT NOT NULL DEFAULT 'webp',
  signature_param TEXT NOT NULL DEFAULT 'sig',
  use_worker INTEGER NOT NULL DEFAULT 0,
  worker_base_url TEXT,
  token_ttl_seconds INTEGER NOT NULL DEFAULT 3600,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  password_algorithm TEXT NOT NULL DEFAULT 'pbkdf2-sha256',
  must_reset INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (username) REFERENCES admin_users(username) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_username ON admin_sessions(username);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);
