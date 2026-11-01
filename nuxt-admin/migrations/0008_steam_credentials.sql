-- Steam 凭证：单行表，API key 只存密文。
-- steam_id 是公开标识，保持明文以便读取接口与同步直接使用。
CREATE TABLE IF NOT EXISTS steam_credentials (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  steam_id TEXT NOT NULL,
  api_key_cipher TEXT,
  api_key_iv TEXT,
  key_last4 TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
