import { createServerFn } from "@tanstack/react-start";

import { getSubmissionRecipients as resolveSubmissionRecipients } from "@/server/npuContacts";
import {
  createMondayVotingReportBoard,
  createMondayVotingReportBoardInputSchema,
  getMondayVotingReportBoardConfig,
  pushReportToMonday,
} from "@/server/monday";
import { getAppEnv, getNpuTeamSubmissionEmail } from "@/server/platform";
import { sendSubmissionNotifications } from "@/server/reportEmail";
import {
  addWorkflowEvent,
  attachFinalizedPdfMetadata,
  completeMondayProvisioningKey,
  consumeMondayProvisioningKey,
  consumeSignatureToken,
  createReportRevision,
  createReviewToken,
  failMondayProvisioningKey,
  getActiveMondayBoardConfig,
  getReport,
  getReportByToken,
  listReports,
  saveReportSignature,
  updateReportStatus,
  updateReportMondayItemId,
  upsertReport,
} from "@/server/reportStorage";
import {
  createRevisionInputSchema,
  getSubmissionRecipientsInputSchema,
  reportIdInputSchema,
  reportSignatureInputSchema,
  reviewInputSchema,
  submitForReviewInputSchema,
  tokenInputSchema,
} from "@/lib/votingReportWorkflow";

async function hashProvisioningKey(provisioningKey: string) {
  const bytes = new TextEncoder().encode(provisioningKey);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getMondayBoardConfigForSync() {
  const appEnv = getAppEnv();
  const activeConfig = await getActiveMondayBoardConfig();
  const boardId = activeConfig?.board?.id || appEnv.MONDAY_BOARD_ID;

  if (!boardId) {
    return activeConfig;
  }

  return (await getMondayVotingReportBoardConfig(boardId)) || activeConfig;
}

async function syncReportWithMonday(report: Awaited<ReturnType<typeof getReport>>) {
  if (!report) {
    return report;
  }

  try {
    const boardConfig = await getMondayBoardConfigForSync();
    if (!boardConfig) {
      console.warn("No monday.com board configuration found, skipping monday sync.");
      return report;
    }

    const itemId = await pushReportToMonday(boardConfig, report);
    if (itemId && itemId !== report.mondayItemId) {
      return (await updateReportMondayItemId(report.id, itemId)) ?? report;
    }
  } catch (error) {
    console.error("Failed to sync report to monday.com:", error);
  }

  return report;
}

export const getSubmissionRecipients = createServerFn({ method: "POST" })
  .inputValidator(getSubmissionRecipientsInputSchema)
  .handler(async ({ data }) => {
    return resolveSubmissionRecipients(data.npu, getNpuTeamSubmissionEmail());
  });

export const provisionMondayVotingReportBoard = createServerFn({ method: "POST" })
  .inputValidator(createMondayVotingReportBoardInputSchema)
  .handler(async ({ data }) => {
    const appEnv = getAppEnv();

    if (!appEnv.MONDAY_PROVISIONING_KEY) {
      throw new Error("MONDAY_PROVISIONING_KEY is not configured.");
    }

    if (data.provisioningKey !== appEnv.MONDAY_PROVISIONING_KEY) {
      throw new Error("Invalid monday.com provisioning key.");
    }

    const keyHash = await hashProvisioningKey(data.provisioningKey);
    await consumeMondayProvisioningKey(keyHash);

    try {
      const result = await createMondayVotingReportBoard({
        ...data,
        workspaceId: data.workspaceId ?? appEnv.MONDAY_WORKSPACE_ID,
      });

      await completeMondayProvisioningKey(keyHash, {
        boardId: result.board.id,
        boardUrl: result.board.url,
        resultJson: JSON.stringify(result),
      });

      return result;
    } catch (error) {
      await failMondayProvisioningKey(
        keyHash,
        error instanceof Error ? error.message : "Unable to provision monday.com board.",
      );
      throw error;
    }
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
    await sendSubmissionNotifications(report);

    await syncReportWithMonday(report);

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

    await syncReportWithMonday(report);

    return getReport(data.reportId);
  });

export const signReport = createServerFn({ method: "POST" })
  .inputValidator(reportSignatureInputSchema)
  .handler(async ({ data }) => {
    const isValidToken = await consumeSignatureToken(data.token, data.reportId, data.role);
    if (!isValidToken) {
      throw new Error("Invalid or expired signature token. Please use the link provided in your email.");
    }

    const report = await saveReportSignature(data.reportId, {
      role: data.role,
      signerName: data.signerName,
      signedDate: data.signedDate,
    });
    if (!report) {
      throw new Error("Report not found.");
    }

    const roleLabel = data.role === "chair" ? "Chair" : "Planner";
    await addWorkflowEvent(data.reportId, {
      eventType: `${data.role}_signed`,
      actorName: data.signerName,
      actorEmail: data.role === "chair" ? report.chairEmail : report.plannerEmail,
      comments: `${roleLabel} signature recorded for ${data.signedDate}.`,
    });

    return getReport(data.reportId);
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

    await syncReportWithMonday(report);

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
