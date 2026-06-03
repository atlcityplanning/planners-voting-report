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

export type ReportSignatureRole = "chair" | "planner";

export type ReportSignature = {
  id: string;
  role: ReportSignatureRole;
  signerName: string;
  signedDate: string;
  createdAt: string;
  updatedAt: string;
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
  signatures: Record<ReportSignatureRole, ReportSignature | null>;
  chairSignatureToken: string | null;
  plannerSignatureToken: string | null;
  finalizedPdf: FinalizedPdfMetadata | null;
};

export type SubmissionRecipients = {
  chairEmail: string;
  plannerEmail: string;
  npuTeamEmail: string;
};

const CROCKFORD_BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const REPORT_ID_TIME_LENGTH = 10;
const REPORT_ID_RANDOM_LENGTH = 6;

function createSchemaId() {
  return crypto.randomUUID();
}

function encodeCrockfordBase32(value: number, length: number) {
  let encoded = "";
  let currentValue = value;

  for (let index = 0; index < length; index += 1) {
    encoded = CROCKFORD_BASE32_ALPHABET[currentValue % 32] + encoded;
    currentValue = Math.floor(currentValue / 32);
  }

  return encoded;
}

function getRandomReportIdSuffix() {
  const bytes = new Uint8Array(REPORT_ID_RANDOM_LENGTH);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => CROCKFORD_BASE32_ALPHABET[byte % 32])
    .join("");
}

export function createReportId() {
  return `${encodeCrockfordBase32(Date.now(), REPORT_ID_TIME_LENGTH)}${getRandomReportIdSuffix()}`;
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
  pdfBase64: z.string().optional(),
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

export const reportSignatureInputSchema = z.object({
  reportId: z.string().min(1),
  role: z.enum(["chair", "planner"]),
  token: z.string().min(1, "Valid signature token is required."),
  signerName: z.string().trim().min(1, "Signature name is required."),
  signedDate: z.iso.date("Signature date is required."),
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
