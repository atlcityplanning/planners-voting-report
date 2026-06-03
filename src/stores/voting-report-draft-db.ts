import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import { z } from "zod";

import type { ReportFormState } from "@/lib/votingReport";
import { reportFormStateSchema } from "@/lib/votingReportWorkflow";

export const VOTING_REPORT_DRAFT_ID = "active";
export const VOTING_REPORT_DRAFT_STORAGE_KEY = "npu-voting-report-db:v1";

export const votingReportDraftSchema = z.object({
  id: z.literal(VOTING_REPORT_DRAFT_ID),
  report: reportFormStateSchema,
});

export type VotingReportDraft = {
  id: typeof VOTING_REPORT_DRAFT_ID;
  report: ReportFormState;
};

export const votingReportDraftCollection = createCollection(
  localStorageCollectionOptions({
    id: "npu-voting-report-drafts",
    storageKey: VOTING_REPORT_DRAFT_STORAGE_KEY,
    getKey: (draft: VotingReportDraft) => draft.id,
    schema: votingReportDraftSchema,
  }),
);
