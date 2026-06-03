import { z } from "zod";

import { getAppEnv, getPublicAppUrl } from "@/server/platform";
import type { StoredVotingReport } from "@/lib/votingReportWorkflow";

const MONDAY_API_URL = "https://api.monday.com/v2";
const DEFAULT_MONDAY_API_VERSION = "2025-10";

const MONDAY_BOARD_GROUPS = [
  { key: "submittedForReview", title: "Submitted for Review", color: "#579bfc" },
  { key: "changesRequested", title: "Changes Requested", color: "#fdab3d" },
  { key: "finalized", title: "Finalized", color: "#037f4c" },
] as const;

const MONDAY_BOARD_COLUMNS = [
  { key: "npu", title: "NPU", type: "text" },
  { key: "meetingDate", title: "Meeting Date", type: "date" },
  { key: "planner", title: "Planner", type: "text" },
  { key: "chair", title: "Chair", type: "text" },
  { key: "plannerEmail", title: "Planner Email", type: "email" },
  { key: "chairEmail", title: "Chair Email", type: "email" },
  { key: "npuTeamEmail", title: "NPU Team Email", type: "email" },
  { key: "submittedAt", title: "Submitted At", type: "date" },
  { key: "finalizedAt", title: "Finalized At", type: "date" },
  { key: "agendaItemCount", title: "Agenda Items", type: "numbers" },
  { key: "reportLink", title: "Report Link", type: "link" },
  { key: "pdfLink", title: "PDF Link", type: "link" },
  { key: "generatedPdf", title: "Generated PDF", type: "file" },
  { key: "plannerNotes", title: "Planner Notes", type: "long_text" },
] as const;

const MONDAY_STATUS_LABELS = [
  { label: "Submitted for Review", color: "working_orange", index: 0 },
  { label: "Changes Requested", color: "stuck_red", index: 1 },
  { label: "Finalized", color: "done_green", index: 2, is_done: true },
] as const;

const boardKindSchema = z.enum(["public", "private", "share"]);
const numericIdSchema = z.string().trim().regex(/^\d+$/, "Must be a numeric monday.com ID.");

export const createMondayVotingReportBoardInputSchema = z.object({
  provisioningKey: z.string().min(1).optional().default(""),
  boardName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .default("NPU Voting Reports"),
  boardDescription: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .default("Tracks NPU voting report submissions, review status, and finalized PDFs."),
  boardKind: boardKindSchema.optional().default("private"),
  workspaceId: numericIdSchema.optional(),
});

type CreateMondayVotingReportBoardInput = z.infer<
  typeof createMondayVotingReportBoardInputSchema
>;
type MondayBoardKind = z.infer<typeof boardKindSchema>;
type MondayBoardGroupKey = (typeof MONDAY_BOARD_GROUPS)[number]["key"];
type MondayBoardColumnKey = "reportStatus" | (typeof MONDAY_BOARD_COLUMNS)[number]["key"];

type MondayBoard = {
  id: string;
  name: string;
  url: string;
};

type MondayGroup = {
  id: string;
  title: string;
  color: string;
};

type MondayColumn = {
  id: string;
  title: string;
  type: string;
};

type MondayGraphqlError = {
  message?: string;
};

type MondayGraphqlResponse<TData> = {
  data?: TData;
  errors?: Array<MondayGraphqlError>;
  error_code?: string;
  error_message?: string;
};

export type MondayVotingReportBoardConfig = {
  board: MondayBoard;
  groups: Record<MondayBoardGroupKey, MondayGroup>;
  columns: Record<MondayBoardColumnKey, MondayColumn>;
};

type MondayClientOptions = {
  token: string;
  apiVersion: string;
};

function assertNumericId(value: string, name: string) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be a numeric monday.com ID.`);
  }

  return value;
}

function getCreateBoardQuery(boardKind: MondayBoardKind, workspaceId?: string) {
  const args = [
    "board_name: $boardName",
    `board_kind: ${boardKind}`,
    "description: $boardDescription",
  ];

  if (workspaceId) {
    args.push(`workspace_id: ${assertNumericId(workspaceId, "workspaceId")}`);
  }

  return `mutation CreateNpuVotingReportBoard($boardName: String!, $boardDescription: String!) {
    create_board(${args.join(", ")}) {
      id
      name
      url
    }
  }`;
}

function getCreateStatusColumnQuery(boardId: string) {
  return `mutation CreateNpuVotingReportStatusColumn {
    create_status_column(
      board_id: ${assertNumericId(boardId, "boardId")}
      title: "Report Status"
      defaults: {
        labels: [
          ${MONDAY_STATUS_LABELS.map(
            (label) =>
              `{ color: ${label.color}, label: ${JSON.stringify(label.label)}, index: ${
                label.index
              }${"is_done" in label && label.is_done ? ", is_done: true" : ""} }`,
          ).join("\n          ")}
        ]
      }
    ) {
      id
      title
    }
  }`;
}

function getCreateGroupQuery(boardId: string) {
  return `mutation CreateNpuVotingReportGroup($groupName: String!, $groupColor: String!) {
    create_group(
      board_id: ${assertNumericId(boardId, "boardId")}
      group_name: $groupName
      group_color: $groupColor
    ) {
      id
      title
      color
    }
  }`;
}

function getCreateColumnQuery(boardId: string, columnType: string) {
  return `mutation CreateNpuVotingReportColumn($title: String!) {
    create_column(
      board_id: ${assertNumericId(boardId, "boardId")}
      title: $title
      column_type: ${columnType}
    ) {
      id
      title
      type
    }
  }`;
}

async function mondayQuery<TData>(
  clientOptions: MondayClientOptions,
  query: string,
  variables?: Record<string, unknown>,
) {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: clientOptions.token,
      "API-Version": clientOptions.apiVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });

  const body = (await response.json().catch(() => null)) as MondayGraphqlResponse<TData> | null;

  if (!response.ok) {
    throw new Error(`monday.com API request failed with status ${response.status}.`);
  }

  if (!body) {
    throw new Error("monday.com API returned an unreadable response.");
  }

  if (body.errors?.length) {
    const message = body.errors.map((error) => error.message).filter(Boolean).join(" ");
    throw new Error(message || "monday.com API returned a GraphQL error.");
  }

  if (body.error_message) {
    throw new Error(body.error_message);
  }

  if (!body.data) {
    throw new Error("monday.com API response did not include data.");
  }

  return body.data;
}

async function createMondayBoard(
  clientOptions: MondayClientOptions,
  input: CreateMondayVotingReportBoardInput,
) {
  const data = await mondayQuery<{ create_board: MondayBoard }>(
    clientOptions,
    getCreateBoardQuery(input.boardKind, input.workspaceId),
    {
      boardName: input.boardName,
      boardDescription: input.boardDescription,
    },
  );

  return data.create_board;
}

async function createMondayStatusColumn(clientOptions: MondayClientOptions, boardId: string) {
  const data = await mondayQuery<{ create_status_column: Pick<MondayColumn, "id" | "title"> }>(
    clientOptions,
    getCreateStatusColumnQuery(boardId),
  );

  return {
    ...data.create_status_column,
    type: "status",
  };
}

async function createMondayGroup(
  clientOptions: MondayClientOptions,
  boardId: string,
  group: (typeof MONDAY_BOARD_GROUPS)[number],
) {
  const data = await mondayQuery<{ create_group: MondayGroup }>(
    clientOptions,
    getCreateGroupQuery(boardId),
    {
      groupName: group.title,
      groupColor: group.color,
    },
  );

  return data.create_group;
}

async function createMondayColumn(
  clientOptions: MondayClientOptions,
  boardId: string,
  column: (typeof MONDAY_BOARD_COLUMNS)[number],
) {
  const data = await mondayQuery<{ create_column: MondayColumn }>(
    clientOptions,
    getCreateColumnQuery(boardId, column.type),
    {
      title: column.title,
    },
  );

  return data.create_column;
}

export async function createMondayVotingReportBoard(
  input: CreateMondayVotingReportBoardInput,
): Promise<MondayVotingReportBoardConfig> {
  const appEnv = getAppEnv();
  const token = appEnv.MONDAY_API_TOKEN;

  if (!token) {
    throw new Error("MONDAY_API_TOKEN is not configured.");
  }

  const clientOptions = {
    token,
    apiVersion: appEnv.MONDAY_API_VERSION || DEFAULT_MONDAY_API_VERSION,
  };
  const board = await createMondayBoard(clientOptions, input);
  const statusColumn = await createMondayStatusColumn(clientOptions, board.id);
  const groups = {} as Record<MondayBoardGroupKey, MondayGroup>;
  const columns = {
    reportStatus: statusColumn,
  } as Record<MondayBoardColumnKey, MondayColumn>;

  for (const group of MONDAY_BOARD_GROUPS) {
    groups[group.key] = await createMondayGroup(clientOptions, board.id, group);
  }

  for (const column of MONDAY_BOARD_COLUMNS) {
    columns[column.key] = await createMondayColumn(clientOptions, board.id, column);
  }

  return {
    board,
    groups,
    columns,
  };
}

export async function createMondayItem(
  clientOptions: MondayClientOptions,
  boardId: string,
  groupId: string,
  itemName: string,
  columnValues: Record<string, unknown>,
) {
  const query = `mutation CreateItem($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
    create_item(
      board_id: $boardId,
      group_id: $groupId,
      item_name: $itemName,
      column_values: $columnValues
    ) {
      id
    }
  }`;

  const data = await mondayQuery<{ create_item: { id: string } }>(clientOptions, query, {
    boardId,
    groupId,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });

  return data.create_item.id;
}

export async function uploadFileToMondayItem(
  clientOptions: MondayClientOptions,
  itemId: string,
  columnId: string,
  pdfBase64: string,
) {
  const binaryString = atob(pdfBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/pdf" });

  const query = `mutation add_file($file: File!) { add_file_to_column (item_id: ${itemId}, column_id: "${columnId}", file: $file) { id } }`;
  
  const formData = new FormData();
  formData.append("query", query);
  formData.append("variables[file]", blob, "voting-report.pdf");

  const response = await fetch("https://api.monday.com/v2/file", {
    method: "POST",
    headers: {
      Authorization: clientOptions.token,
      "API-Version": clientOptions.apiVersion,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`monday.com API file upload failed with status ${response.status}.`);
  }

  const body = await response.json().catch(() => null) as MondayGraphqlResponse<{ add_file_to_column: { id: string } }> | null;
  
  if (body?.errors?.length) {
    const message = body.errors.map((error) => error.message).filter(Boolean).join(" ");
    throw new Error(message || "monday.com API returned a GraphQL error on file upload.");
  }
}

export async function pushReportToMonday(
  boardConfig: MondayVotingReportBoardConfig,
  report: StoredVotingReport,
  pdfBase64?: string,
) {
  const appEnv = getAppEnv();
  const token = appEnv.MONDAY_API_TOKEN;
  if (!token) {
    console.warn("MONDAY_API_TOKEN is not configured, skipping monday sync.");
    return;
  }

  const clientOptions = {
    token,
    apiVersion: appEnv.MONDAY_API_VERSION || DEFAULT_MONDAY_API_VERSION,
  };

  const appUrl = getPublicAppUrl();

  const columnValues: Record<string, unknown> = {
    [boardConfig.columns.npu.id]: report.report.npu,
    [boardConfig.columns.meetingDate.id]: { date: report.report.meetingDate || new Date().toISOString().split("T")[0] },
    [boardConfig.columns.planner.id]: report.report.planner,
    [boardConfig.columns.chair.id]: report.report.chair,
  };
  
  if (report.plannerEmail) {
    columnValues[boardConfig.columns.plannerEmail.id] = { email: report.plannerEmail, text: report.plannerEmail };
  }
  if (report.chairEmail) {
    columnValues[boardConfig.columns.chairEmail.id] = { email: report.chairEmail, text: report.chairEmail };
  }
  if (report.npuTeamEmail) {
    columnValues[boardConfig.columns.npuTeamEmail.id] = { email: report.npuTeamEmail, text: report.npuTeamEmail };
  }

  columnValues[boardConfig.columns.submittedAt.id] = { date: (report.submittedAt || report.createdAt).split("T")[0] };
  columnValues[boardConfig.columns.agendaItemCount.id] = report.report.items.length;
  columnValues[boardConfig.columns.reportLink.id] = { url: `${appUrl}/dashboard/${report.id}`, text: "View Dashboard" };
  columnValues[boardConfig.columns.reportStatus.id] = { label: "Submitted for Review" };
  
  if (report.report.plannerNotes) {
    columnValues[boardConfig.columns.plannerNotes.id] = report.report.plannerNotes;
  }

  const itemId = await createMondayItem(
    clientOptions,
    boardConfig.board.id,
    boardConfig.groups.submittedForReview.id,
    `Report: NPU ${report.report.npu} - ${report.report.meetingDate || "Pending"}`,
    columnValues,
  );

  if (pdfBase64) {
    try {
      await uploadFileToMondayItem(
        clientOptions,
        itemId,
        boardConfig.columns.generatedPdf.id,
        pdfBase64
      );
    } catch (err) {
      console.error("Failed to upload PDF to Monday item:", err);
    }
  }
}

