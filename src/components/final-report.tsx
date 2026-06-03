import { Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getReportPrintLabels } from "@/lib/votingReport";
import type { StoredVotingReport } from "@/lib/votingReportWorkflow";
import { getReportById } from "@/server/reportActions";

type FinalReportProps = {
  reportId: string;
};

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-colors hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 print:hidden";

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

export default function FinalReport({ reportId }: FinalReportProps) {
  const [report, setReport] = useState<StoredVotingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const printLabels = useMemo(
    () => getReportPrintLabels(report?.report.npu ?? "", report?.report.meetingDate ?? ""),
    [report?.report.meetingDate, report?.report.npu],
  );

  useEffect(() => {
    async function loadReport() {
      setIsLoading(true);
      const loadedReport = await getReportById({ data: { reportId } });
      setReport(loadedReport);
      setIsLoading(false);
    }

    void loadReport();
  }, [reportId]);

  useEffect(() => {
    if (!report?.report.meetingDate) {
      return;
    }

    const previousTitle = document.title;
    document.title = printLabels.documentTitle;
    return () => {
      document.title = previousTitle;
    };
  }, [printLabels.documentTitle, report?.report.meetingDate]);

  if (isLoading) {
    return (
      <main className="mx-auto w-[min(960px,calc(100%-2rem))] py-8 print:w-full print:py-0">
        <p className="font-bold text-foreground">Loading final report...</p>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="mx-auto w-[min(960px,calc(100%-2rem))] py-8 print:w-full print:py-0">
        <h1 className="text-2xl font-extrabold text-foreground">Report not found</h1>
      </main>
    );
  }

  const chairSignature = report.signatures.chair;
  const plannerSignature = report.signatures.planner;

  return (
    <main className="mx-auto w-[min(960px,calc(100%-2rem))] py-8 print:w-full print:py-0">
      <header className="mb-6 print:mb-5">
        <img
          src="/npu-logo-black.png"
          alt="City of Atlanta Department of City Planning Neighborhood Planning Units"
          className="mx-auto mb-8 block w-[min(680px,90%)] object-contain print:mb-6 print:w-[4.8in]"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground print:text-black">
              Final Report | Revision {report.revision}
            </p>
            <h1 className="m-0 font-display text-5xl font-semibold uppercase leading-none text-foreground print:text-3xl">
              {printLabels.headerTitle}
            </h1>
          </div>
          <button type="button" className={buttonClass} onClick={() => window.print()}>
            <Printer aria-hidden="true" size={18} />
            Print / Save PDF
          </button>
        </div>
      </header>

      <section className="mb-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <div className="grid gap-3 text-sm sm:grid-cols-2 print:grid-cols-2">
          {[
            ["NPU", report.report.npu],
            ["Chair", report.report.chair || "Not provided"],
            ["Meeting Date", report.report.meetingDate || "Not provided"],
            ["Location", report.report.location || "Not provided"],
            ["Planner", report.report.planner || "Not provided"],
            ["Status", report.status.replace(/_/g, " ")],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 print:grid-cols-[max-content_1fr] print:gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground print:text-black">
                {label}
              </span>
              <span className="font-bold text-foreground print:text-black">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-4 overflow-hidden rounded-2xl bg-card text-sm shadow-sm ring-1 ring-border print:rounded-none print:shadow-none print:ring-0">
        <table className="w-full table-fixed border-collapse print:text-[10pt]">
          <thead className="bg-muted print:bg-white">
            <tr>
              <th className="w-28 border-b border-border px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground print:border print:border-neutral-600 print:px-2 print:py-1 print:text-black">
                Type
              </th>
              <th className="border-b border-border px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground print:border print:border-neutral-600 print:px-2 print:py-1 print:text-black">
                Application # / Name
              </th>
              <th className="w-48 border-b border-border px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground print:border print:border-neutral-600 print:px-2 print:py-1 print:text-black">
                Recommendation
              </th>
            </tr>
          </thead>
          <tbody>
            {report.report.items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={3}>
                  No agenda items recorded.
                </td>
              </tr>
            ) : (
              report.report.items.map((item) => (
                <tr key={item.id} className="break-inside-avoid border-b border-border">
                  <td className="px-3 py-2 font-bold text-foreground print:border print:border-neutral-600 print:px-2 print:py-1 print:text-black">
                    {item.itemType}
                  </td>
                  <td className="px-3 py-2 print:border print:border-neutral-600 print:px-2 print:py-1">
                    <p className="m-0 font-semibold text-foreground print:text-black">
                      {item.applicationName}
                    </p>
                    {item.comments ? (
                      <p className="m-0 mt-1 whitespace-pre-wrap text-muted-foreground print:text-black">
                        {item.comments}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-foreground print:border print:border-neutral-600 print:px-2 print:py-1 print:text-black">
                    {item.recommendation}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mb-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <h2 className="m-0 mb-3 text-lg font-extrabold text-foreground print:text-black">
          Planner&apos;s Notes
        </h2>
        <p className="m-0 whitespace-pre-wrap leading-6 text-muted-foreground print:text-black">
          {report.report.plannerNotes || "No planner notes recorded."}
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
        <div className="rounded-lg border border-border p-4 print:border-neutral-600">
          <p className="m-0 text-sm font-bold text-foreground print:text-black">
            Chair Signature
          </p>
          <p className="m-0 mt-2 text-sm text-muted-foreground print:text-black">
            {chairSignature
              ? `${chairSignature.signerName} | ${formatSignedDate(chairSignature.signedDate)}`
              : "Not signed"}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 print:border-neutral-600">
          <p className="m-0 text-sm font-bold text-foreground print:text-black">
            Planner Signature
          </p>
          <p className="m-0 mt-2 text-sm text-muted-foreground print:text-black">
            {plannerSignature
              ? `${plannerSignature.signerName} | ${formatSignedDate(plannerSignature.signedDate)}`
              : "Not signed"}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-border p-4 print:border-neutral-600">
        <p className="m-0 text-sm font-bold text-foreground print:text-black">Finalization</p>
        <p className="m-0 mt-2 text-sm text-muted-foreground print:text-black">
          {report.finalizedAt ? formatDateTime(report.finalizedAt) : "Not finalized"}
        </p>
      </section>
    </main>
  );
}
