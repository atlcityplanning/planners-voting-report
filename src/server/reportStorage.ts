import { NPU_CONTACT_SOURCE } from "@/lib/npuContactDirectory";
import { INITIAL_REPORT_STATE } from "@/lib/votingReport";
import type { AgendaItem, ReportFormState } from "@/lib/votingReport";
import type {
  FinalizedPdfMetadata,
  ReportSignature,
  ReportSignatureRole,
  NotificationAttempt,
  ReportStatus,
  StoredVotingReport,
  WorkflowEvent,
} from "@/lib/votingReportWorkflow";
import { createReportId, normalizeReportFormState } from "@/lib/votingReportWorkflow";
import { getAppEnv } from "@/server/platform";

const SCHEMA_SQL = `
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
`;

type ReportRow = {
  id: string;
  status: string;
  npu: string;
  chair: string;
  location: string;
  planner: string;
  meeting_date: string;
  autofill: number;
  planner_notes: string;
  chair_email: string;
  planner_email: string;
  npu_team_email: string;
  contact_source_version: string;
  revision: number;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  finalized_at: string;
};

type ItemRow = {
  id: string;
  item_type: string;
  application_name: string;
  recommendation: string;
  comments: string;
};

type NotificationRow = {
  id: string;
  recipient_email: string;
  recipient_role: NotificationAttempt["recipientRole"];
  status: NotificationAttempt["status"];
  subject: string;
  error: string;
  created_at: string;
};

type EventRow = {
  id: string;
  event_type: string;
  actor_name: string;
  actor_email: string;
  comments: string;
  created_at: string;
};

type SignatureRow = {
  id: string;
  signer_role: ReportSignatureRole;
  signer_name: string;
  signed_date: string;
  created_at: string;
  updated_at: string;
};

type FinalizedPdfRow = {
  id: string;
  revision: number;
  pdf_url: string;
  storage_key: string;
  created_at: string;
};

type ReportUpsertInput = {
  reportId?: string;
  report: ReportFormState;
  status: ReportStatus;
  chairEmail: string;
  plannerEmail: string;
  npuTeamEmail: string;
  submittedAt?: string;
};

type NotificationInsert = Omit<NotificationAttempt, "id" | "createdAt"> & {
  createdAt?: string;
};

type EventInsert = Omit<WorkflowEvent, "id" | "createdAt"> & {
  createdAt?: string;
};

const memoryReports = new Map<string, StoredVotingReport>();
const memoryMondayProvisioningKeys = new Map<
  string,
  {
    status: "pending" | "completed" | "failed";
    boardId: string;
    boardUrl: string;
    resultJson: string;
    error: string;
    consumedAt: string;
    completedAt: string;
    failedAt: string;
  }
>();
const memoryTokens = new Map<
  string,
  {
    token: string;
    reportId: string;
    purpose: "review";
    recipientEmail: string;
    expiresAt: string;
    createdAt: string;
  }
>();
const ensuredDbs = new WeakSet<D1Database>();

function createEmptySignatures(): Record<ReportSignatureRole, ReportSignature | null> {
  return {
    chair: null,
    planner: null,
  };
}

function createId() {
  return crypto.randomUUID();
}

async function createUniqueReportId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reportId = createReportId();
    const existingReport = await getReport(reportId);
    if (!existingReport) {
      return reportId;
    }
  }

  throw new Error("Unable to create unique report ID.");
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeStoredStatus(status: string): ReportStatus {
  if (status === "approved_for_chair" || status === "chair_authorized") {
    return "submitted_for_review";
  }

  if (
    status === "draft" ||
    status === "submitted_for_review" ||
    status === "changes_requested" ||
    status === "finalized"
  ) {
    return status;
  }

  return "submitted_for_review";
}

function createBlankStoredReport(
  input: ReportUpsertInput,
  existing?: StoredVotingReport,
): StoredVotingReport {
  const timestamp = nowIso();
  const report = normalizeReportFormState(input.report);
  const id = input.reportId || existing?.id || createReportId();

  return {
    id,
    status: input.status,
    report,
    chairEmail: input.chairEmail,
    plannerEmail: input.plannerEmail,
    npuTeamEmail: input.npuTeamEmail,
    contactSourceVersion: NPU_CONTACT_SOURCE.version,
    revision: existing?.revision ?? 1,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    submittedAt: input.submittedAt ?? existing?.submittedAt ?? "",
    finalizedAt: existing?.finalizedAt ?? "",
    notificationAttempts: existing?.notificationAttempts ?? [],
    workflowEvents: existing?.workflowEvents ?? [],
    signatures: existing?.signatures ?? createEmptySignatures(),
    finalizedPdf: existing?.finalizedPdf ?? null,
  };
}

async function ensureSchema(db: D1Database) {
  if (ensuredDbs.has(db)) {
    return;
  }

  for (const statement of SCHEMA_SQL.split(";").map((sql) => sql.trim()).filter(Boolean)) {
    await db.prepare(statement).run();
  }

  await db
    .prepare(
      `INSERT OR IGNORE INTO contact_directory_versions
        (version, source_name, revised_on, expires_on)
      VALUES (?, ?, ?, ?)`,
    )
    .bind(
      NPU_CONTACT_SOURCE.version,
      NPU_CONTACT_SOURCE.sourceName,
      NPU_CONTACT_SOURCE.revisedOn,
      NPU_CONTACT_SOURCE.expiresOn,
    )
    .run();
  ensuredDbs.add(db);
}

function getD1() {
  return getAppEnv().NPU_REPORTS_DB;
}

function rowToReport(row: ReportRow, items: Array<AgendaItem>): ReportFormState {
  return {
    ...INITIAL_REPORT_STATE,
    npu: row.npu,
    chair: row.chair,
    location: row.location,
    planner: row.planner,
    meetingDate: row.meeting_date,
    autofill: row.autofill === 1,
    plannerNotes: row.planner_notes,
    items,
  };
}

async function hydrateD1Report(db: D1Database, row: ReportRow): Promise<StoredVotingReport> {
  const [
    itemResult,
    notificationResult,
    eventResult,
    signatureResult,
    finalizedPdfRow,
  ] =
    await Promise.all([
      db
        .prepare(
          `SELECT id, item_type, application_name, recommendation, comments
          FROM voting_report_items
          WHERE report_id = ?
          ORDER BY position ASC`,
        )
        .bind(row.id)
        .all<ItemRow>(),
      db
        .prepare(
          `SELECT id, recipient_email, recipient_role, status, subject, error, created_at
          FROM notification_attempts
          WHERE report_id = ?
          ORDER BY created_at DESC`,
        )
        .bind(row.id)
        .all<NotificationRow>(),
      db
        .prepare(
          `SELECT id, event_type, actor_name, actor_email, comments, created_at
          FROM workflow_events
          WHERE report_id = ?
          ORDER BY created_at DESC`,
        )
        .bind(row.id)
        .all<EventRow>(),
      db
        .prepare(
          `SELECT id, signer_role, signer_name, signed_date, created_at, updated_at
          FROM report_signatures
          WHERE report_id = ?`,
        )
        .bind(row.id)
        .all<SignatureRow>(),
      db
        .prepare(
          `SELECT id, revision, pdf_url, storage_key, created_at
          FROM finalized_pdf_metadata
          WHERE report_id = ?
          ORDER BY created_at DESC
          LIMIT 1`,
        )
        .bind(row.id)
        .first<FinalizedPdfRow>(),
    ]);

  const items = (itemResult.results ?? []).map((item) => ({
    id: item.id,
    itemType: item.item_type as AgendaItem["itemType"],
    applicationName: item.application_name,
    recommendation: item.recommendation as AgendaItem["recommendation"],
    comments: item.comments,
  }));
  const signatures = createEmptySignatures();
  for (const signature of signatureResult.results ?? []) {
    signatures[signature.signer_role] = {
      id: signature.id,
      role: signature.signer_role,
      signerName: signature.signer_name,
      signedDate: signature.signed_date,
      createdAt: signature.created_at,
      updatedAt: signature.updated_at,
    };
  }

  return {
    id: row.id,
    status: normalizeStoredStatus(row.status),
    report: rowToReport(row, items),
    chairEmail: row.chair_email,
    plannerEmail: row.planner_email,
    npuTeamEmail: row.npu_team_email,
    contactSourceVersion: row.contact_source_version,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
    finalizedAt: row.finalized_at,
    notificationAttempts: (notificationResult.results ?? []).map((notification) => ({
      id: notification.id,
      recipientEmail: notification.recipient_email,
      recipientRole: notification.recipient_role,
      status: notification.status,
      subject: notification.subject,
      error: notification.error,
      createdAt: notification.created_at,
    })),
    workflowEvents: (eventResult.results ?? []).map((event) => ({
      id: event.id,
      eventType: event.event_type,
      actorName: event.actor_name,
      actorEmail: event.actor_email,
      comments: event.comments,
      createdAt: event.created_at,
    })),
    signatures,
    finalizedPdf: finalizedPdfRow
      ? {
          id: finalizedPdfRow.id,
          revision: finalizedPdfRow.revision,
          pdfUrl: finalizedPdfRow.pdf_url,
          storageKey: finalizedPdfRow.storage_key,
          createdAt: finalizedPdfRow.created_at,
        }
      : null,
  };
}

async function getD1Report(db: D1Database, reportId: string) {
  await ensureSchema(db);
  const row = await db
    .prepare(
      `SELECT id, status, npu, chair, location, planner, meeting_date, autofill,
        planner_notes, chair_email, planner_email, npu_team_email,
        contact_source_version, revision, created_at, updated_at, submitted_at,
        finalized_at
      FROM voting_reports
      WHERE id = ?`,
    )
    .bind(reportId)
    .first<ReportRow>();

  if (!row) {
    return null;
  }

  return hydrateD1Report(db, row);
}

export async function upsertReport(input: ReportUpsertInput) {
  const db = getD1();
  const reportId = input.reportId ?? (await createUniqueReportId());
  const existing = await getReport(reportId);
  const storedReport = createBlankStoredReport({ ...input, reportId }, existing ?? undefined);

  if (!db) {
    memoryReports.set(storedReport.id, storedReport);
    return storedReport;
  }

  await ensureSchema(db);
  await db
    .prepare(
      `INSERT INTO voting_reports (
        id, status, npu, chair, location, planner, meeting_date, autofill,
        planner_notes, chair_email, planner_email, npu_team_email,
        contact_source_version, revision, created_at, updated_at, submitted_at,
        finalized_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        npu = excluded.npu,
        chair = excluded.chair,
        location = excluded.location,
        planner = excluded.planner,
        meeting_date = excluded.meeting_date,
        autofill = excluded.autofill,
        planner_notes = excluded.planner_notes,
        chair_email = excluded.chair_email,
        planner_email = excluded.planner_email,
        npu_team_email = excluded.npu_team_email,
        contact_source_version = excluded.contact_source_version,
        revision = excluded.revision,
        updated_at = excluded.updated_at,
        submitted_at = excluded.submitted_at,
        finalized_at = excluded.finalized_at`,
    )
    .bind(
      storedReport.id,
      storedReport.status,
      storedReport.report.npu,
      storedReport.report.chair,
      storedReport.report.location,
      storedReport.report.planner,
      storedReport.report.meetingDate,
      storedReport.report.autofill ? 1 : 0,
      storedReport.report.plannerNotes,
      storedReport.chairEmail,
      storedReport.plannerEmail,
      storedReport.npuTeamEmail,
      storedReport.contactSourceVersion,
      storedReport.revision,
      storedReport.createdAt,
      storedReport.updatedAt,
      storedReport.submittedAt,
      storedReport.finalizedAt,
    )
    .run();

  await db.prepare("DELETE FROM voting_report_items WHERE report_id = ?").bind(storedReport.id).run();
  if (storedReport.report.items.length > 0) {
    await db.batch(
      storedReport.report.items.map((item, position) =>
        db
          .prepare(
            `INSERT INTO voting_report_items
              (id, report_id, position, item_type, application_name, recommendation, comments)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            item.id,
            storedReport.id,
            position,
            item.itemType,
            item.applicationName,
            item.recommendation,
            item.comments,
          ),
      ),
    );
  }

  return (await getD1Report(db, storedReport.id)) ?? storedReport;
}

export async function consumeMondayProvisioningKey(keyHash: string) {
  const consumedAt = nowIso();
  const db = getD1();

  if (!db) {
    if (memoryMondayProvisioningKeys.has(keyHash)) {
      throw new Error("This monday.com provisioning key has already been used.");
    }

    memoryMondayProvisioningKeys.set(keyHash, {
      status: "pending",
      boardId: "",
      boardUrl: "",
      resultJson: "",
      error: "",
      consumedAt,
      completedAt: "",
      failedAt: "",
    });
    return;
  }

  await ensureSchema(db);
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO monday_provisioning_keys
        (key_hash, status, consumed_at)
      VALUES (?, ?, ?)`,
    )
    .bind(keyHash, "pending", consumedAt)
    .run();

  if (result.meta.changes === 0) {
    throw new Error("This monday.com provisioning key has already been used.");
  }
}

export async function completeMondayProvisioningKey(
  keyHash: string,
  result: { boardId: string; boardUrl: string; resultJson: string },
) {
  const completedAt = nowIso();
  const db = getD1();

  if (!db) {
    const keyRecord = memoryMondayProvisioningKeys.get(keyHash);
    if (!keyRecord) {
      return;
    }

    memoryMondayProvisioningKeys.set(keyHash, {
      ...keyRecord,
      status: "completed",
      boardId: result.boardId,
      boardUrl: result.boardUrl,
      resultJson: result.resultJson,
      completedAt,
    });
    return;
  }

  await ensureSchema(db);
  await db
    .prepare(
      `UPDATE monday_provisioning_keys
      SET status = ?, board_id = ?, board_url = ?, result_json = ?, completed_at = ?
      WHERE key_hash = ?`,
    )
    .bind("completed", result.boardId, result.boardUrl, result.resultJson, completedAt, keyHash)
    .run();
}

export async function failMondayProvisioningKey(keyHash: string, error: string) {
  const failedAt = nowIso();
  const db = getD1();

  if (!db) {
    const keyRecord = memoryMondayProvisioningKeys.get(keyHash);
    if (!keyRecord) {
      return;
    }

    memoryMondayProvisioningKeys.set(keyHash, {
      ...keyRecord,
      status: "failed",
      error,
      failedAt,
    });
    return;
  }

  await ensureSchema(db);
  await db
    .prepare(
      `UPDATE monday_provisioning_keys
      SET status = ?, error = ?, failed_at = ?
      WHERE key_hash = ?`,
    )
    .bind("failed", error, failedAt, keyHash)
    .run();
}

export async function getReport(reportId: string) {
  const db = getD1();
  if (!db) {
    return memoryReports.get(reportId) ?? null;
  }

  return getD1Report(db, reportId);
}

export async function listReports() {
  const db = getD1();
  if (!db) {
    return Array.from(memoryReports.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  await ensureSchema(db);
  const rows = await db
    .prepare(
      `SELECT id, status, npu, chair, location, planner, meeting_date, autofill,
        planner_notes, chair_email, planner_email, npu_team_email,
        contact_source_version, revision, created_at, updated_at, submitted_at,
        finalized_at
      FROM voting_reports
      ORDER BY updated_at DESC`,
    )
    .all<ReportRow>();

  return Promise.all((rows.results ?? []).map((row) => hydrateD1Report(db, row)));
}

export async function addNotificationAttempt(reportId: string, attempt: NotificationInsert) {
  const createdAt = attempt.createdAt ?? nowIso();
  const notificationAttempt: NotificationAttempt = {
    id: createId(),
    createdAt,
    ...attempt,
  };

  const db = getD1();
  if (!db) {
    const report = memoryReports.get(reportId);
    if (report) {
      report.notificationAttempts = [notificationAttempt, ...report.notificationAttempts];
      report.updatedAt = createdAt;
      memoryReports.set(reportId, report);
    }
    return notificationAttempt;
  }

  await ensureSchema(db);
  await db
    .prepare(
      `INSERT INTO notification_attempts
        (id, report_id, channel, recipient_email, recipient_role, status, subject, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      notificationAttempt.id,
      reportId,
      "email",
      notificationAttempt.recipientEmail,
      notificationAttempt.recipientRole,
      notificationAttempt.status,
      notificationAttempt.subject,
      notificationAttempt.error,
      notificationAttempt.createdAt,
    )
    .run();

  return notificationAttempt;
}

export async function addWorkflowEvent(reportId: string, event: EventInsert) {
  const createdAt = event.createdAt ?? nowIso();
  const workflowEvent: WorkflowEvent = {
    id: createId(),
    createdAt,
    ...event,
  };

  const db = getD1();
  if (!db) {
    const report = memoryReports.get(reportId);
    if (report) {
      report.workflowEvents = [workflowEvent, ...report.workflowEvents];
      report.updatedAt = createdAt;
      memoryReports.set(reportId, report);
    }
    return workflowEvent;
  }

  await ensureSchema(db);
  await db
    .prepare(
      `INSERT INTO workflow_events
        (id, report_id, event_type, actor_name, actor_email, comments, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      workflowEvent.id,
      reportId,
      workflowEvent.eventType,
      workflowEvent.actorName,
      workflowEvent.actorEmail,
      workflowEvent.comments,
      "{}",
      workflowEvent.createdAt,
    )
    .run();

  return workflowEvent;
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  options: { finalizedAt?: string } = {},
) {
  const db = getD1();
  const timestamp = nowIso();

  if (!db) {
    const report = memoryReports.get(reportId);
    if (!report) {
      return null;
    }

    const nextReport = {
      ...report,
      status,
      finalizedAt: options.finalizedAt ?? report.finalizedAt,
      updatedAt: timestamp,
    };
    memoryReports.set(reportId, nextReport);
    return nextReport;
  }

  await ensureSchema(db);
  await db
    .prepare(
      `UPDATE voting_reports
      SET status = ?, finalized_at = COALESCE(NULLIF(?, ''), finalized_at), updated_at = ?
      WHERE id = ?`,
    )
    .bind(status, options.finalizedAt ?? "", timestamp, reportId)
    .run();

  return getD1Report(db, reportId);
}

export async function saveReportSignature(
  reportId: string,
  input: Pick<ReportSignature, "role" | "signerName" | "signedDate">,
) {
  const timestamp = nowIso();
  const db = getD1();

  if (!db) {
    const report = memoryReports.get(reportId);
    if (!report) {
      return null;
    }

    const existing = report.signatures[input.role];
    const signature: ReportSignature = {
      id: existing?.id ?? createId(),
      role: input.role,
      signerName: input.signerName,
      signedDate: input.signedDate,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    const nextReport = {
      ...report,
      updatedAt: timestamp,
      signatures: {
        ...report.signatures,
        [input.role]: signature,
      },
    };
    memoryReports.set(reportId, nextReport);
    return nextReport;
  }

  await ensureSchema(db);
  const existing = await db
    .prepare(
      `SELECT id, created_at
      FROM report_signatures
      WHERE report_id = ? AND signer_role = ?`,
    )
    .bind(reportId, input.role)
    .first<{ id: string; created_at: string }>();

  const signatureId = existing?.id ?? createId();
  const createdAt = existing?.created_at ?? timestamp;
  await db
    .prepare(
      `INSERT INTO report_signatures
        (id, report_id, signer_role, signer_name, signed_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(report_id, signer_role) DO UPDATE SET
        signer_name = excluded.signer_name,
        signed_date = excluded.signed_date,
        updated_at = excluded.updated_at`,
    )
    .bind(
      signatureId,
      reportId,
      input.role,
      input.signerName,
      input.signedDate,
      createdAt,
      timestamp,
    )
    .run();

  await db
    .prepare("UPDATE voting_reports SET updated_at = ? WHERE id = ?")
    .bind(timestamp, reportId)
    .run();

  return getD1Report(db, reportId);
}

export async function createReportRevision(reportId: string, reason: string) {
  const report = await getReport(reportId);
  if (!report) {
    return null;
  }

  const nextRevision = report.revision + 1;
  const createdAt = nowIso();
  const db = getD1();

  if (!db) {
    const nextReport = {
      ...report,
      status: "draft" as ReportStatus,
      revision: nextRevision,
      updatedAt: createdAt,
    };
    memoryReports.set(reportId, nextReport);
    return nextReport;
  }

  await ensureSchema(db);
  await db
    .prepare(
      `INSERT INTO report_revisions
        (id, report_id, revision, snapshot_json, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(createId(), reportId, report.revision, JSON.stringify(report), reason, createdAt)
    .run();
  await db
    .prepare("UPDATE voting_reports SET status = ?, revision = ?, updated_at = ? WHERE id = ?")
    .bind("draft", nextRevision, createdAt, reportId)
    .run();

  return getD1Report(db, reportId);
}

export async function createReviewToken(
  reportId: string,
  purpose: "review",
  recipientEmail: string,
) {
  const token = createId();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const db = getD1();

  if (!db) {
    const tokenRecord = { token, reportId, purpose, recipientEmail, expiresAt, createdAt };
    memoryTokens.set(token, tokenRecord);
    return tokenRecord;
  }

  await ensureSchema(db);
  await db
    .prepare(
      `INSERT INTO review_tokens
        (token, report_id, purpose, recipient_email, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(token, reportId, purpose, recipientEmail, expiresAt, createdAt)
    .run();

  return { token, reportId, purpose, recipientEmail, expiresAt, createdAt };
}

export async function getReportByToken(token: string) {
  const db = getD1();
  if (!db) {
    const tokenRecord = memoryTokens.get(token);
    if (!tokenRecord || tokenRecord.expiresAt <= nowIso()) {
      return null;
    }

    return memoryReports.get(tokenRecord.reportId) ?? null;
  }

  await ensureSchema(db);
  const tokenRow = await db
    .prepare("SELECT report_id FROM review_tokens WHERE token = ? AND expires_at > ?")
    .bind(token, nowIso())
    .first<{ report_id: string }>();

  if (!tokenRow) {
    return null;
  }

  return getD1Report(db, tokenRow.report_id);
}

export async function consumeSignatureToken(token: string, reportId: string, role: ReportSignatureRole) {
  const db = getD1();
  const purpose = `${role}_signature`;
  if (!db) {
    const tokenRecord = memoryTokens.get(token);
    if (!tokenRecord || tokenRecord.expiresAt <= nowIso() || tokenRecord.purpose !== purpose || tokenRecord.reportId !== reportId) {
      return false;
    }
    memoryTokens.delete(token);
    return true;
  }

  await ensureSchema(db);
  const result = await db.prepare(
    "DELETE FROM review_tokens WHERE token = ? AND report_id = ? AND purpose = ? AND expires_at > ?"
  ).bind(token, reportId, purpose, nowIso()).run();

  return result.meta.changes > 0;
}

export async function attachFinalizedPdfMetadata(reportId: string) {
  const report = await getReport(reportId);
  if (!report) {
    return null;
  }

  const createdAt = nowIso();
  const pdfMetadata: FinalizedPdfMetadata = {
    id: createId(),
    revision: report.revision,
    pdfUrl: `/reports/${reportId}/print`,
    storageKey: "",
    createdAt,
  };

  const db = getD1();
  if (!db) {
    const nextReport = {
      ...report,
      status: "finalized" as ReportStatus,
      finalizedAt: createdAt,
      finalizedPdf: pdfMetadata,
      updatedAt: createdAt,
    };
    memoryReports.set(reportId, nextReport);
    return nextReport;
  }

  await ensureSchema(db);
  await db
    .prepare(
      `INSERT INTO finalized_pdf_metadata
        (id, report_id, revision, pdf_url, storage_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      pdfMetadata.id,
      reportId,
      pdfMetadata.revision,
      pdfMetadata.pdfUrl,
      pdfMetadata.storageKey,
      pdfMetadata.createdAt,
    )
    .run();

  return updateReportStatus(reportId, "finalized", { finalizedAt: createdAt });
}

export async function getActiveMondayBoardConfig() {
  const db = getD1();
  if (!db) {
    const keys = Array.from(memoryMondayProvisioningKeys.values());
    const completed = keys.filter((k) => k.status === "completed").sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    if (completed.length === 0) return null;
    try {
      return JSON.parse(completed[0].resultJson);
    } catch {
      return null;
    }
  }

  await ensureSchema(db);
  const row = await db.prepare(
    "SELECT result_json FROM monday_provisioning_keys WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1"
  ).first<{ result_json: string }>();

  if (!row) return null;
  try {
    return JSON.parse(row.result_json);
  } catch {
    return null;
  }
}
