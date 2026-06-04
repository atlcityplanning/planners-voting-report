import { Store } from "@tanstack/store";
import type { SubmissionRecipients } from "@/lib/votingReportWorkflow";

export const EMPTY_SUBMISSION_RECIPIENTS: SubmissionRecipients = {
  chairEmail: "",
  plannerEmail: "",
  npuTeamEmail: "",
};

export type UiState = {
  draggingId: string | null;
  openCommentIds: Array<string>;
  submissionRecipients: SubmissionRecipients;
  isPreparingSubmission: boolean;
  isSubmissionDialogOpen: boolean;
  isSubmittingReport: boolean;
  submissionMessage: string;
  submittedReportId: string;
};

export const uiStore = new Store<UiState>({
  draggingId: null,
  openCommentIds: [],
  submissionRecipients: EMPTY_SUBMISSION_RECIPIENTS,
  isPreparingSubmission: false,
  isSubmissionDialogOpen: false,
  isSubmittingReport: false,
  submissionMessage: "",
  submittedReportId: "",
});

export function setDraggingId(id: string | null) {
  uiStore.setState((state) => ({ ...state, draggingId: id }));
}


export function setOpenCommentIds(ids: Array<string> | ((prev: Array<string>) => Array<string>)) {
  uiStore.setState((state) => ({
    ...state,
    openCommentIds: typeof ids === "function" ? ids(state.openCommentIds) : ids,
  }));
}

export function setSubmissionRecipients(recipients: SubmissionRecipients | ((prev: SubmissionRecipients) => SubmissionRecipients)) {
  uiStore.setState((state) => ({
    ...state,
    submissionRecipients:
      typeof recipients === "function" ? recipients(state.submissionRecipients) : recipients,
  }));
}

export function setIsPreparingSubmission(isPreparing: boolean) {
  uiStore.setState((state) => ({ ...state, isPreparingSubmission: isPreparing }));
}

export function setIsSubmittingReport(isSubmitting: boolean) {
  uiStore.setState((state) => ({ ...state, isSubmittingReport: isSubmitting }));
}

export function setSubmissionMessage(message: string) {
  uiStore.setState((state) => ({ ...state, submissionMessage: message }));
}

export function setSubmittedReportId(id: string) {
  uiStore.setState((state) => ({ ...state, submittedReportId: id }));
}

export function setIsSubmissionDialogOpen(isOpen: boolean) {
  uiStore.setState((state) => ({ ...state, isSubmissionDialogOpen: isOpen }));
}
