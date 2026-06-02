import { z } from "zod";

import {
  INITIAL_REPORT_STATE,
  normalizeItemType,
  normalizeRecommendation,
} from "@/lib/votingReport";
import type { AgendaItem, ReportFormState } from "@/lib/votingReport";

export const REPORT_STATUSES = [
  "draft",
  "submitted_for_review",
  "changes_requested",
  "approved_for_chair",
  "chair_authorized",
  "finalized",
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type NotificationAttempt = {
  id: string;
  recipientEmail: string;
  recipientRole: "chair" | "npu_team" | "planner";
  status: "sent" | "failed" | "skipped";
  subject: string;
  error: string;
  createdAt: string;
};

export type WorkflowEvent = {
  id: string;
  eventType: string;
  actorName: string;
  actorEmail: string;
  comments: string;
  createdAt: string;
};

export type AuthorizationRecord = {
  id: string;
  signerName: string;
  signerEmail: string;
  acceptedStatement: boolean;
  signedAt: string;
};

export type FinalizedPdfMetadata = {
  id: string;
  revision: number;
  pdfUrl: string;
  storageKey: string;
  createdAt: string;
};

export type StoredVotingReport = {
  id: string;
  status: ReportStatus;
  report: ReportFormState;
  chairEmail: string;
  plannerEmail: string;
  npuTeamEmail: string;
  contactSourceVersion: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
  finalizedAt: string;
  notificationAttempts: Array<NotificationAttempt>;
  workflowEvents: Array<WorkflowEvent>;
  authorization: AuthorizationRecord | null;
  finalizedPdf: FinalizedPdfMetadata | null;
};

export type SubmissionRecipients = {
  chairEmail: string;
  plannerEmail: string;
  npuTeamEmail: string;
};

function createSchemaId() {
  return crypto.randomUUID();
}

export const agendaItemSchema = z
  .object({
    id: z.string().min(1).optional(),
    itemType: z.string().min(1).transform(normalizeItemType),
    applicationName: z.string().trim().min(1, "Application # / Name is required."),
    recommendation: z.string().min(1).transform(normalizeRecommendation),
    comments: z.string().optional().default(""),
  })
  .transform(
    (item): AgendaItem => ({
      ...item,
      id: item.id ?? createSchemaId(),
    }),
  );

export const reportFormStateSchema = z
  .object({
    npu: z.string().min(1),
    chair: z.string().trim().default(""),
    location: z.string().trim().default(""),
    planner: z.string().trim().default(""),
    meetingDate: z.string().trim().default(""),
    autofill: z.boolean().default(INITIAL_REPORT_STATE.autofill),
    plannerNotes: z.string().default(""),
    items: z.array(agendaItemSchema).default([]),
  })
  .transform((report): ReportFormState => report);

export const emailRecipientSchema = z.email().or(z.literal(""));

export const getSubmissionRecipientsInputSchema = z.object({
  npu: z.string().min(1),
});

export const submitForReviewInputSchema = z.object({
  reportId: z.string().min(1).optional(),
  report: reportFormStateSchema,
  recipients: z.object({
    chairEmail: emailRecipientSchema,
    plannerEmail: emailRecipientSchema.optional().default(""),
    npuTeamEmail: emailRecipientSchema,
  }),
});

export const reportIdInputSchema = z.object({
  reportId: z.string().min(1),
});

export const tokenInputSchema = z.object({
  token: z.string().min(1),
});

export const reviewInputSchema = z.object({
  reportId: z.string().min(1),
  actorName: z.string().trim().default(""),
  actorEmail: emailRecipientSchema.optional().default(""),
  comments: z.string().trim().default(""),
});

export const authorizationInputSchema = z.object({
  token: z.string().min(1),
  signerName: z.string().trim().min(1, "Signer name is required."),
  signerEmail: emailRecipientSchema,
  acceptedStatement: z.literal(true),
});

export const createRevisionInputSchema = z.object({
  reportId: z.string().min(1),
  reason: z.string().trim().default("Revision created after finalization."),
});

export function normalizeReportFormState(report: ReportFormState): ReportFormState {
  return reportFormStateSchema.parse(report);
}

export function normalizeAgendaItems(items: Array<AgendaItem>): Array<AgendaItem> {
  return items.map((item) => ({
    id: item.id,
    itemType: normalizeItemType(item.itemType),
    applicationName: item.applicationName.trim(),
    recommendation: normalizeRecommendation(item.recommendation),
    comments: item.comments,
  }));
}
