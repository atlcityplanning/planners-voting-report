CREATE TABLE IF NOT EXISTS report_signatures (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signed_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(report_id, signer_role),
  FOREIGN KEY (report_id) REFERENCES voting_reports(id) ON DELETE CASCADE
);
