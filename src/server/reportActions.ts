import { createServerFn } from "@tanstack/react-start";

import { getSubmissionRecipients as resolveSubmissionRecipients } from "@/server/npuContacts";
import { getNpuTeamSubmissionEmail } from "@/server/platform";
import { sendSubmissionNotifications } from "@/server/reportEmail";
import {
  addAuthorizationRecord,
  addWorkflowEvent,
  attachFinalizedPdfMetadata,
  createReportRevision,
  createReviewToken,
  getReport,
  getReportByToken,
  listReports,
  updateReportStatus,
  upsertReport,
} from "@/server/reportStorage";
import {
  authorizationInputSchema,
  createRevisionInputSchema,
  getSubmissionRecipientsInputSchema,
  reportIdInputSchema,
  reviewInputSchema,
  submitForReviewInputSchema,
  tokenInputSchema,
} from "@/lib/votingReportWorkflow";

export const getSubmissionRecipients = createServerFn({ method: "POST" })
  .inputValidator(getSubmissionRecipientsInputSchema)
  .handler(async ({ data }) => {
    return resolveSubmissionRecipients(data.npu, getNpuTeamSubmissionEmail());
  });

export const submitForReview = createServerFn({ method: "POST" })
  .inputValidator(submitForReviewInputSchema)
  .handler(async ({ data }) => {
    const submittedAt = new Date().toISOString();
    const report = await upsertReport({
      reportId: data.reportId,
      report: data.report,
      status: "submitted_for_review",
      chairEmail: data.recipients.chairEmail,
      plannerEmail: data.recipients.plannerEmail,
      npuTeamEmail: data.recipients.npuTeamEmail,
      submittedAt,
    });

    await addWorkflowEvent(report.id, {
      eventType: "submitted_for_review",
      actorName: report.report.planner,
      actorEmail: report.plannerEmail,
      comments: "Report submitted for centralized review.",
    });
    await createReviewToken(report.id, "review", report.npuTeamEmail);
    await createReviewToken(report.id, "authorize", report.chairEmail);
    await sendSubmissionNotifications(report);

    return (await getReport(report.id)) ?? report;
  });

export const getReportById = createServerFn({ method: "POST" })
  .inputValidator(reportIdInputSchema)
  .handler(async ({ data }) => {
    return getReport(data.reportId);
  });

export const listVotingReports = createServerFn({ method: "GET" }).handler(async () => {
  return listReports();
});

export const resendSubmissionNotification = createServerFn({ method: "POST" })
  .inputValidator(reportIdInputSchema)
  .handler(async ({ data }) => {
    const report = await getReport(data.reportId);
    if (!report) {
      throw new Error("Report not found.");
    }

    await sendSubmissionNotifications(report);
    return getReport(data.reportId);
  });

export const approveReportForChair = createServerFn({ method: "POST" })
  .inputValidator(reviewInputSchema)
  .handler(async ({ data }) => {
    const report = await updateReportStatus(data.reportId, "approved_for_chair");
    if (!report) {
      throw new Error("Report not found.");
    }

    await addWorkflowEvent(data.reportId, {
      eventType: "approved_for_chair",
      actorName: data.actorName,
      actorEmail: data.actorEmail,
      comments: data.comments || "Report approved for chair authorization.",
    });

    return getReport(data.reportId);
  });

export const requestReportChanges = createServerFn({ method: "POST" })
  .inputValidator(reviewInputSchema)
  .handler(async ({ data }) => {
    const report = await updateReportStatus(data.reportId, "changes_requested");
    if (!report) {
      throw new Error("Report not found.");
    }

    await addWorkflowEvent(data.reportId, {
      eventType: "changes_requested",
      actorName: data.actorName,
      actorEmail: data.actorEmail,
      comments: data.comments || "Changes requested.",
    });

    return getReport(data.reportId);
  });

export const authorizeReport = createServerFn({ method: "POST" })
  .inputValidator(authorizationInputSchema)
  .handler(async ({ data }) => {
    const report = await getReportByToken(data.token);
    if (!report) {
      throw new Error("Authorization link is invalid or expired.");
    }

    await addAuthorizationRecord(report.id, {
      signerName: data.signerName,
      signerEmail: data.signerEmail,
      acceptedStatement: data.acceptedStatement,
      token: data.token,
    });
    await addWorkflowEvent(report.id, {
      eventType: "chair_authorized",
      actorName: data.signerName,
      actorEmail: data.signerEmail,
      comments: "Chair authorization recorded.",
    });

    return getReport(report.id);
  });

export const finalizeReport = createServerFn({ method: "POST" })
  .inputValidator(reportIdInputSchema)
  .handler(async ({ data }) => {
    const report = await attachFinalizedPdfMetadata(data.reportId);
    if (!report) {
      throw new Error("Report not found.");
    }

    await addWorkflowEvent(data.reportId, {
      eventType: "finalized",
      actorName: "",
      actorEmail: "",
      comments: "Final report route marked as finalized PDF source.",
    });

    return getReport(data.reportId);
  });

export const createRevision = createServerFn({ method: "POST" })
  .inputValidator(createRevisionInputSchema)
  .handler(async ({ data }) => {
    const report = await createReportRevision(data.reportId, data.reason);
    if (!report) {
      throw new Error("Report not found.");
    }

    await addWorkflowEvent(data.reportId, {
      eventType: "revision_created",
      actorName: "",
      actorEmail: "",
      comments: data.reason,
    });

    return getReport(data.reportId);
  });

export const getReportForToken = createServerFn({ method: "POST" })
  .inputValidator(tokenInputSchema)
  .handler(async ({ data }) => {
    return getReportByToken(data.token);
  });
