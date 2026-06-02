CREATE TABLE IF NOT EXISTS contact_directory_versions (
  version TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  revised_on TEXT NOT NULL,
  expires_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS voting_reports (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  npu TEXT NOT NULL,
  chair TEXT NOT NULL,
  location TEXT NOT NULL,
  planner TEXT NOT NULL,
  meeting_date TEXT NOT NULL,
  autofill INTEGER NOT NULL,
  planner_notes TEXT NOT NULL,
  chair_email TEXT NOT NULL,
  planner_email TEXT NOT NULL,
  npu_team_email TEXT NOT NULL,
  contact_source_version TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT '',
  finalized_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS voting_report_items (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  application_name TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  comments TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (report_id) REFERENCES voting_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_events (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  comments TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (report_id) REFERENCES voting_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_attempts (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT NOT NULL,
  error TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (report_id) REFERENCES voting_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_tokens (
  token TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (report_id) REFERENCES voting_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS authorization_records (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  accepted_statement INTEGER NOT NULL,
  signed_at TEXT NOT NULL,
  token TEXT NOT NULL,
  FOREIGN KEY (report_id) REFERENCES voting_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_revisions (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (report_id) REFERENCES voting_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS finalized_pdf_metadata (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  pdf_url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (report_id) REFERENCES voting_reports(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO contact_directory_versions
  (version, source_name, revised_on, expires_on)
VALUES
  ('2026', '2026 NPU INTERNAL Contact List.pdf', '2026-04-13', '2026-12-31');
