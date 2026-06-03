import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import type { StoredVotingReport } from "@/lib/votingReportWorkflow";
import {
  getReportForToken,
  requestReportChanges,
} from "@/server/reportActions";

type TokenPageProps = {
  token: string;
};

const panelClass =
  "rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-sm ring-1 ring-border";
const fieldClass =
  "min-h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15";

function ReportTokenSummary({ report }: { report: StoredVotingReport }) {
  return (
    <section className={panelClass}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        NPU {report.report.npu}
      </p>
      <h1 className="m-0 font-display text-5xl font-semibold uppercase leading-none text-foreground sm:text-6xl">
        Voting Report
      </h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["Meeting Date", report.report.meetingDate || "Not provided"],
          ["Chair", report.report.chair || "Not provided"],
          ["Planner", report.report.planner || "Not provided"],
          ["Items", String(report.report.items.length)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted/70 p-3">
            <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="m-0 mt-1 font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReviewTokenPage({ token }: TokenPageProps) {
  const [report, setReport] = useState<StoredVotingReport | null>(null);
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      setIsLoading(true);
      setReport(await getReportForToken({ data: { token } }));
      setIsLoading(false);
    }

    void loadReport();
  }, [token]);

  async function requestChanges() {
    if (!report) {
      return;
    }

    const nextReport = await requestReportChanges({
      data: {
        reportId: report.id,
        comments,
      },
    });

    setReport(nextReport);
    setMessage("Changes requested.");
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-[min(900px,calc(100%-2rem))] py-8">
        <section className={panelClass}>Loading review link...</section>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="mx-auto w-[min(900px,calc(100%-2rem))] py-8">
        <section className={panelClass}>Review link is invalid or expired.</section>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-[min(900px,calc(100%-2rem))] gap-4 py-8">
      <ReportTokenSummary report={report} />
      <section className={panelClass}>
        <h2 className="m-0 mb-4 text-lg font-extrabold text-foreground">Requestor Review</h2>
        <label className="grid gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Review Comments
          </span>
          <textarea
            className={fieldClass}
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            rows={4}
          />
        </label>
        {message ? (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground">
            {message}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={buttonClass} onClick={() => void requestChanges()}>
            <RotateCcw aria-hidden="true" size={18} />
            Request Changes
          </button>
        </div>
      </section>
    </main>
  );
}
