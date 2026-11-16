-- MCP 机读凭证：具名、带 scope、可单独吊销。
-- 只存 SHA-256(pepper:token)，与 admin_sessions 同一套原语；明文只在签发时返回一次。
CREATE TABLE IF NOT EXISTS mcp_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash   TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  username     TEXT NOT NULL,
  label        TEXT NOT NULL,
  scopes       TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  last_used_at TEXT,
  expires_at   TEXT NOT NULL,
  revoked_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_username ON mcp_tokens(username);
