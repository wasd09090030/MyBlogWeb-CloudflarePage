-- Ciphertext now records which master key sealed it (fingerprint, not a counter).
-- Rows written before this migration have NULL key_id and are intentionally not
-- decryptable: re-enter the credential from the admin page.
ALTER TABLE steam_credentials ADD COLUMN key_id TEXT;
