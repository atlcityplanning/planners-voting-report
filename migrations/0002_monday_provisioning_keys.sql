CREATE TABLE IF NOT EXISTS monday_provisioning_keys (
  key_hash TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  board_id TEXT NOT NULL DEFAULT '',
  board_url TEXT NOT NULL DEFAULT '',
  result_json TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  consumed_at TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT '',
  failed_at TEXT NOT NULL DEFAULT ''
);
