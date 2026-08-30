-- Daily diary entries: one row per calendar day (YYYY-MM-DD).
-- Mood/weather are constrained to the same set used by the public feed UI.
-- "碎碎念" public page reads only is_public = 1.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS diary_entries (
  entry_date TEXT PRIMARY KEY,          -- 'YYYY-MM-DD'，一天一条
  content_markdown TEXT NOT NULL,       -- Markdown 正文（公开页全文直出）
  mood TEXT NOT NULL DEFAULT 'calm' CHECK (mood IN ('happy', 'excited', 'calm', 'busy', 'tired', 'cozy', 'pensive')),
  weather TEXT NOT NULL DEFAULT 'sunny' CHECK (weather IN ('sunny', 'cloudy', 'overcast', 'rain', 'thunder', 'haze')),
  location TEXT,                        -- 地点（可选）
  tags TEXT NOT NULL DEFAULT '[]',      -- JSON 数组
  is_public INTEGER NOT NULL DEFAULT 1, -- 0 = 草稿/隐藏
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_entry_date ON diary_entries(entry_date);
