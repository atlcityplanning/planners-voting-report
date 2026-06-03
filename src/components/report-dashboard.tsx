import {
  CheckCircle2,
  FileText,
  Mail,
  PencilLine,
  Printer,
  RefreshCcw,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { ReportSignatureRole, StoredVotingReport } from "@/lib/votingReportWorkflow";
import {
  createRevision,
  finalizeReport,
  getReportById,
  requestReportChanges,
  resendSubmissionNotification,
  signReport,
} from "@/server/reportActions";
import { cn } from "@/utils/cn";

type ReportDashboardProps = {
  reportId: string;
};

type SignatureDraft = {
  signerName: string;
  signedDate: string;
};

const panelClass =
  "rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-sm ring-1 ring-border";
const labelClass = "text-[10px] font-bold uppercase tracking-wide text-muted-foreground";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-colors hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20";

function formatDateTime(value: string) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getTodayInputDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function formatSignedDate(value: string) {
  if (!value) {
    return "Not recorded";
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[2]}/${dateOnlyMatch[3]}/${dateOnlyMatch[1]}`;
  }

  return formatDateTime(value);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-accent-foreground ring-1 ring-primary/10">
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SignatureForm({
  role,
  title,
  signature,
  draft,
  onDraftChange,
  onSave,
  canSign,
}: {
  role: ReportSignatureRole;
  title: string;
  signature: StoredVotingReport["signatures"][ReportSignatureRole];
  draft: SignatureDraft;
  onDraftChange: (role: ReportSignatureRole, draft: SignatureDraft) => void;
  onSave: (role: ReportSignatureRole) => Promise<void>;
  canSign: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-extrabold text-foreground">{title}</h3>
        <span className="text-xs font-semibold text-muted-foreground">
          {signature
            ? `${signature.signerName} | ${formatSignedDate(signature.signedDate)}`
            : "Not signed"}
        </span>
      </div>
      
      {canSign && !signature ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(role);
          }}
        >
          <label className={labelClass} htmlFor={`${role}-signature-name`}>
            Signature
          </label>
          <input
            id={`${role}-signature-name`}
            className="mb-3 mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            required
            type="text"
            value={draft.signerName}
            onChange={(event) =>
              onDraftChange(role, {
                ...draft,
                signerName: event.target.value,
              })
            }
          />
          <label className={labelClass} htmlFor={`${role}-signature-date`}>
            Date
          </label>
          <input
            id={`${role}-signature-date`}
            className="mb-4 mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            required
            type="date"
            value={draft.signedDate}
            onChange={(event) =>
              onDraftChange(role, {
                ...draft,
                signedDate: event.target.value,
              })
            }
          />
          <button type="submit" className={buttonClass}>
            <CheckCircle2 aria-hidden="true" size={18} />
            Save {title}
          </button>
        </form>
      ) : (
        signature ? null : <p className="text-sm text-muted-foreground">Awaiting signature via email link.</p>
      )}
    </div>
  );
}

function ReportOverview({ report }: { report: StoredVotingReport }) {
  const fields = [
    ["NPU", report.report.npu],
    ["Meeting Date", report.report.meetingDate || "Not provided"],
    ["Chair", report.report.chair || "Not provided"],
    ["Planner", report.report.planner || "Not provided"],
    ["Location", report.report.location || "Not provided"],
    ["Revision", String(report.revision)],
  ];

  return (
    <section className={panelClass} aria-labelledby="report-overview-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="report-overview-heading" className="m-0 text-lg font-extrabold text-foreground">
          Report Details
        </h2>
        <StatusBadge status={report.status} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted/70 p-3">
            <p className={labelClass}>{label}</p>
            <p className="m-0 mt-1 font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AgendaItems({ report }: { report: StoredVotingReport }) {
  return (
    <section className={panelClass} aria-labelledby="dashboard-agenda-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="dashboard-agenda-heading" className="m-0 text-lg font-extrabold text-foreground">
          Agenda Items
        </h2>
        <span className="text-xs font-bold text-muted-foreground">
          {report.report.items.length} total
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-3 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                Type
              </th>
              <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                Application # / Name
              </th>
              <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                Recommendation
              </th>
              <th className="py-2 pl-3 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                Comments
              </th>
            </tr>
          </thead>
          <tbody>
            {report.report.items.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-muted-foreground" colSpan={4}>
                  No agenda items recorded.
                </td>
              </tr>
            ) : (
              report.report.items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-3 pr-3 font-bold text-foreground">{item.itemType}</td>
                  <td className="px-3 py-3 text-foreground">{item.applicationName}</td>
                  <td className="px-3 py-3 font-bold text-foreground">{item.recommendation}</td>
                  <td className="py-3 pl-3">{item.comments || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NotificationHistory({ report }: { report: StoredVotingReport }) {
  return (
    <section className={panelClass} aria-labelledby="notification-history-heading">
      <h2 id="notification-history-heading" className="m-0 mb-4 text-lg font-extrabold text-foreground">
        Email History
      </h2>
      <div className="grid gap-2">
        {report.notificationAttempts.length === 0 ? (
          <p className="m-0 text-sm">No notification attempts logged.</p>
        ) : (
          report.notificationAttempts.map((attempt) => (
            <div key={attempt.id} className="rounded-xl bg-muted/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="m-0 font-bold text-foreground">
                  {attempt.recipientRole.replace(/_/g, " ")}:{" "}
                  {attempt.recipientEmail || "No recipient"}
                </p>
                <StatusBadge status={attempt.status} />
              </div>
              <p className="m-0 mt-1 text-xs">{formatDateTime(attempt.createdAt)}</p>
              {attempt.error ? <p className="m-0 mt-1 text-xs">{attempt.error}</p> : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function WorkflowHistory({ report }: { report: StoredVotingReport }) {
  return (
    <section className={panelClass} aria-labelledby="workflow-history-heading">
      <h2 id="workflow-history-heading" className="m-0 mb-4 text-lg font-extrabold text-foreground">
        Review History
      </h2>
      <div className="grid gap-2">
        {report.workflowEvents.length === 0 ? (
          <p className="m-0 text-sm">No workflow events logged.</p>
        ) : (
          report.workflowEvents.map((event) => (
            <div key={event.id} className="rounded-xl bg-muted/70 p-3">
              <p className="m-0 font-bold text-foreground">{event.eventType.replace(/_/g, " ")}</p>
              <p className="m-0 mt-1 text-xs">{formatDateTime(event.createdAt)}</p>
              {event.comments ? <p className="m-0 mt-1">{event.comments}</p> : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function ReportDashboard({ reportId }: ReportDashboardProps) {
  const [report, setReport] = useState<StoredVotingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [signatureDrafts, setSignatureDrafts] = useState<
    Record<ReportSignatureRole, SignatureDraft>
  >({
    chair: { signerName: "", signedDate: getTodayInputDate() },
    planner: { signerName: "", signedDate: getTodayInputDate() },
  });
  const [urlParams, setUrlParams] = useState<{ role: string | null; token: string | null }>({
    role: null,
    token: null,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setUrlParams({
        role: params.get("role"),
        token: params.get("token"),
      });
    }
  }, []);

  async function refreshReport() {
    setIsLoading(true);
    try {
      const nextReport = await getReportById({ data: { reportId } });
      setReport(nextReport);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshReport();
  }, [reportId]);

  useEffect(() => {
    if (!report) {
      return;
    }

    setSignatureDrafts({
      chair: {
        signerName: report.signatures.chair?.signerName || report.report.chair || "",
        signedDate: report.signatures.chair?.signedDate || getTodayInputDate(),
      },
      planner: {
        signerName: report.signatures.planner?.signerName || report.report.planner || "",
        signedDate: report.signatures.planner?.signedDate || getTodayInputDate(),
      },
    });
  }, [
    report,
  ]);

  async function runDashboardAction(
    action: () => Promise<StoredVotingReport | null>,
    message: string,
  ) {
    setStatusMessage("");
    const nextReport = await action();
    setReport(nextReport);
    setStatusMessage(message);
  }

  function updateSignatureDraft(role: ReportSignatureRole, draft: SignatureDraft) {
    setSignatureDrafts((current) => ({
      ...current,
      [role]: draft,
    }));
  }

  async function saveSignature(role: ReportSignatureRole) {
    if (!report) {
      return;
    }

    if (!urlParams.token || urlParams.role !== role) {
      setStatusMessage("Missing or invalid signature token. Please use the link provided in your email.");
      return;
    }

    const roleLabel = role === "chair" ? "Chair" : "Planner";
    const draft = signatureDrafts[role];
    try {
      await runDashboardAction(
        () =>
          signReport({
            data: {
              reportId: report.id,
              role,
              token: urlParams.token!,
              signerName: draft.signerName,
              signedDate: draft.signedDate,
            },
          }),
        `${roleLabel} signature saved.`,
      );
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : String(e));
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-[min(1180px,calc(100%-2rem))] py-8">
        <section className={panelClass}>
          <p className="m-0 font-bold text-foreground">Loading report dashboard...</p>
        </section>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="mx-auto w-[min(1180px,calc(100%-2rem))] py-8">
        <section className={panelClass}>
          <h1 className="m-0 text-2xl font-extrabold text-foreground">Report not found</h1>
          <p className="mb-0 mt-2">No report exists for {reportId}.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-[min(1180px,calc(100%-2rem))] py-8">
      <header className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Report Dashboard
          </p>
          <h1 className="m-0 font-display text-5xl font-semibold uppercase leading-none text-foreground sm:text-6xl">
            NPU {report.report.npu}
          </h1>
          <p className="m-0 mt-3 text-sm text-muted-foreground">
            Created {formatDateTime(report.createdAt)} | Updated {formatDateTime(report.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} onClick={refreshReport}>
            <RefreshCcw aria-hidden="true" size={18} />
            Refresh
          </button>
          <a className={cn(buttonClass, "no-underline")} href={`/reports/${report.id}/print`}>
            <Printer aria-hidden="true" size={18} />
            Print PDF
          </a>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() =>
              runDashboardAction(
                () => resendSubmissionNotification({ data: { reportId: report.id } }),
                "Submission notifications resent or logged.",
              )
            }
          >
            <Mail aria-hidden="true" size={18} />
            Resend
          </button>
        </div>
      </header>

      {statusMessage ? (
        <p className="mb-4 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
          {statusMessage}
        </p>
      ) : null}

      <div className="grid gap-4">
        <ReportOverview report={report} />
        <section className={panelClass} aria-labelledby="dashboard-actions-heading">
          <h2 id="dashboard-actions-heading" className="m-0 mb-4 text-lg font-extrabold text-foreground">
            Workflow Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                runDashboardAction(
                  () =>
                    requestReportChanges({
                      data: {
                        reportId: report.id,
                        comments: "Changes requested from report dashboard.",
                      },
                    }),
                  "Changes requested.",
                )
              }
            >
              <RotateCcw aria-hidden="true" size={18} />
              Request Changes
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                runDashboardAction(
                  () => finalizeReport({ data: { reportId: report.id } }),
                  "Report finalized.",
                )
              }
            >
              <CheckCircle2 aria-hidden="true" size={18} />
              Finalize
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                runDashboardAction(
                  () =>
                    createRevision({
                      data: {
                        reportId: report.id,
                        reason: "Revision opened from report dashboard.",
                      },
                    }),
                  "Revision opened.",
                )
              }
            >
              <PencilLine aria-hidden="true" size={18} />
              Create Revision
            </button>
          </div>
        </section>
        <section className={panelClass} aria-labelledby="dashboard-signatures-heading">
          <h2 id="dashboard-signatures-heading" className="m-0 mb-4 text-lg font-extrabold text-foreground">
            Signatures
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <SignatureForm
              role="chair"
              title="Chair Signature"
              signature={report.signatures.chair}
              draft={signatureDrafts.chair}
              onDraftChange={updateSignatureDraft}
              onSave={saveSignature}
              canSign={urlParams.role === "chair" && !!urlParams.token}
            />
            <SignatureForm
              role="planner"
              title="Planner Signature"
              signature={report.signatures.planner}
              draft={signatureDrafts.planner}
              onDraftChange={updateSignatureDraft}
              onSave={saveSignature}
              canSign={urlParams.role === "planner" && !!urlParams.token}
            />
          </div>
        </section>
        <AgendaItems report={report} />
        <section className={panelClass} aria-labelledby="planner-notes-heading">
          <h2 id="planner-notes-heading" className="m-0 mb-4 text-lg font-extrabold text-foreground">
            Planner Notes
          </h2>
          <p className="m-0 whitespace-pre-wrap leading-6">
            {report.report.plannerNotes || "No planner notes recorded."}
          </p>
        </section>
        <NotificationHistory report={report} />
        <WorkflowHistory report={report} />
        {report.finalizedPdf ? (
          <section className={panelClass} aria-labelledby="final-pdf-heading">
            <h2 id="final-pdf-heading" className="m-0 mb-4 text-lg font-extrabold text-foreground">
              Final PDF
            </h2>
            <p className="m-0 mt-3">
              <FileText aria-hidden="true" className="mr-2 inline-block" size={18} />
              Final PDF route:{" "}
              <a className="font-bold text-primary" href={report.finalizedPdf.pdfUrl}>
                {report.finalizedPdf.pdfUrl}
              </a>
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
