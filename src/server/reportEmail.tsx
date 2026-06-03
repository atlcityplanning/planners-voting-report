import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  render,
} from "@react-email/components";
import nodemailer from "nodemailer";

import type { NotificationAttempt, StoredVotingReport } from "@/lib/votingReportWorkflow";
import { getAppEnv, getPublicAppUrl } from "@/server/platform";
import { addNotificationAttempt } from "@/server/reportStorage";

type RecipientRole = NotificationAttempt["recipientRole"];

type SubmissionEmailProps = {
  report: StoredVotingReport;
  dashboardUrl: string;
};

function formatRecommendationCounts(report: StoredVotingReport) {
  const counts = report.report.items.reduce<Record<string, number>>((currentCounts, item) => {
    currentCounts[item.recommendation] = (currentCounts[item.recommendation] ?? 0) + 1;
    return currentCounts;
  }, {});

  return Object.entries(counts)
    .map(([recommendation, count]) => `${recommendation}: ${count}`)
    .join(" | ");
}

export function VotingReportSubmissionEmail({ report, dashboardUrl }: SubmissionEmailProps) {
  const summary = `NPU ${report.report.npu} voting report submitted for review.`;

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="m-0 bg-slate-100 p-0 font-sans text-slate-900">
          <Preview>{summary}</Preview>
          <Container className="mx-auto max-w-[760px] px-4 py-8">
            <Section className="rounded-2xl bg-white p-6 shadow-sm">
              <Text className="m-0 mb-2 text-xs font-bold uppercase tracking-widest text-blue-700">
                NPU Planner's Voting Report
              </Text>
              <Heading className="m-0 text-3xl font-black leading-tight text-slate-950">
                NPU {report.report.npu} Voting Report Submitted
              </Heading>
              <Text className="mb-0 text-base leading-7 text-slate-600">
                A voting report has been submitted for centralized review.
              </Text>
            </Section>

            <Section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
              <Text className="m-0 text-sm leading-6">
                <strong>Meeting Date:</strong> {report.report.meetingDate || "Not provided"}
              </Text>
              <Text className="m-0 text-sm leading-6">
                <strong>Chair:</strong> {report.report.chair || "Not provided"}
              </Text>
              <Text className="m-0 text-sm leading-6">
                <strong>Planner:</strong> {report.report.planner || "Not provided"}
              </Text>
              <Text className="m-0 text-sm leading-6">
                <strong>Location:</strong> {report.report.location || "Not provided"}
              </Text>
              <Text className="m-0 text-sm leading-6">
                <strong>Agenda Items:</strong> {report.report.items.length}
              </Text>
              <Text className="m-0 text-sm leading-6">
                <strong>Recommendations:</strong>{" "}
                {formatRecommendationCounts(report) || "None recorded"}
              </Text>
            </Section>

            <Section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
              <Text className="m-0 mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Planner Notes
              </Text>
              <Text className="m-0 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {report.report.plannerNotes || "No planner notes were included."}
              </Text>
            </Section>

            <Section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
              <Text className="m-0 mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Agenda Items
              </Text>
              {report.report.items.length === 0 ? (
                <Text className="m-0 text-sm text-slate-500">No agenda items were submitted.</Text>
              ) : (
                report.report.items.map((item) => (
                  <Section key={item.id} className="mb-3 border-0 border-b border-solid border-slate-200 pb-3">
                    <Text className="m-0 text-sm font-bold text-slate-950">
                      {item.itemType} | {item.applicationName}
                    </Text>
                    <Text className="m-0 text-sm text-slate-700">
                      Recommendation: {item.recommendation}
                    </Text>
                    {item.comments ? (
                      <Text className="m-0 text-sm leading-6 text-slate-600">{item.comments}</Text>
                    ) : null}
                  </Section>
                ))
              )}
            </Section>

            <Section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
              <Text className="m-0 text-sm leading-6 text-slate-700">
                Review the report dashboard:
              </Text>
              <Text className="m-0 text-sm font-bold leading-6 text-blue-700">{dashboardUrl}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export function generateSubmissionEmailText(report: StoredVotingReport, dashboardUrl: string) {
  const itemLines = report.report.items.map(
    (item) =>
      `- ${item.itemType} | ${item.applicationName} | ${item.recommendation}${
        item.comments ? ` | ${item.comments}` : ""
      }`,
  );

  return [
    `NPU ${report.report.npu} Voting Report Submitted`,
    "",
    `Meeting Date: ${report.report.meetingDate || "Not provided"}`,
    `Chair: ${report.report.chair || "Not provided"}`,
    `Planner: ${report.report.planner || "Not provided"}`,
    `Location: ${report.report.location || "Not provided"}`,
    `Agenda Items: ${report.report.items.length}`,
    `Recommendations: ${formatRecommendationCounts(report) || "None recorded"}`,
    "",
    "Planner Notes:",
    report.report.plannerNotes || "No planner notes were included.",
    "",
    "Agenda Items:",
    itemLines.length > 0 ? itemLines.join("\n") : "No agenda items were submitted.",
    "",
    `Dashboard: ${dashboardUrl}`,
  ].join("\n");
}

function getFromAddress() {
  const appEnv = getAppEnv();
  return `"NPU Planner's Voting Report" <${appEnv.GMAIL_USER ?? appEnv.NOTIFICATION_FROM_EMAIL ?? "NPUMail@AtlantaGa.Gov"}>`;
}

async function sendOneSubmissionEmail(
  report: StoredVotingReport,
  recipientEmail: string,
  recipientRole: RecipientRole,
) {
  const subject = `NPU ${report.report.npu} Voting Report Submitted`;
  const dashboardUrl = `${getPublicAppUrl()}/dashboard/${report.id}`;
  const appEnv = getAppEnv();

  if (!recipientEmail) {
    return addNotificationAttempt(report.id, {
      recipientEmail: "",
      recipientRole,
      status: "skipped",
      subject,
      error: "No recipient email configured.",
    });
  }

  if (!appEnv.GMAIL_USER || !appEnv.GMAIL_PASS) {
    return addNotificationAttempt(report.id, {
      recipientEmail,
      recipientRole,
      status: "skipped",
      subject,
      error: "Gmail credentials are not configured.",
    });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: appEnv.GMAIL_USER,
      pass: appEnv.GMAIL_PASS,
    },
  });

  try {
    const html = await render(
      <VotingReportSubmissionEmail report={report} dashboardUrl={dashboardUrl} />,
    );
    const text = generateSubmissionEmailText(report, dashboardUrl);

    await transporter.sendMail({
      to: recipientEmail,
      from: getFromAddress(),
      subject,
      html,
      text,
    });

    return addNotificationAttempt(report.id, {
      recipientEmail,
      recipientRole,
      status: "sent",
      subject,
      error: "",
    });
  } catch (error) {
    return addNotificationAttempt(report.id, {
      recipientEmail,
      recipientRole,
      status: "failed",
      subject,
      error: error instanceof Error ? error.message : "Unknown email send error.",
    });
  }
}

export async function sendSubmissionNotifications(report: StoredVotingReport) {
  const recipients: Array<[RecipientRole, string]> = [
    ["chair", report.chairEmail],
    ["npu_team", report.npuTeamEmail],
  ];

  if (report.plannerEmail) {
    recipients.push(["planner", report.plannerEmail]);
  }

  return Promise.all(
    recipients.map(([recipientRole, recipientEmail]) =>
      sendOneSubmissionEmail(report, recipientEmail, recipientRole),
    ),
  );
}
