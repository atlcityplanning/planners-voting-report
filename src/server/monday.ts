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
  { key: "people", title: "People", type: "people" },
  { key: "plannerNotes", title: "Planner Notes", type: "long_text" },
] as const;

const RETIRED_MONDAY_BOARD_COLUMNS = [
  { title: "Generated PDF", type: "file" },
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
    .default("Tracks NPU voting report submissions, review status, and print links."),
  boardKind: boardKindSchema.optional().default("private"),
  workspaceId: numericIdSchema.optional(),
});

type CreateMondayVotingReportBoardInput = z.infer<
  typeof createMondayVotingReportBoardInputSchema
>;
type MondayBoardKind = z.infer<typeof boardKindSchema>;
type MondayBoardGroupKey = (typeof MONDAY_BOARD_GROUPS)[number]["key"];
type MondayBoardColumnKey = "reportStatus" | (typeof MONDAY_BOARD_COLUMNS)[number]["key"];
type MondayReportStatusLabel = "Submitted for Review" | "Changes Requested" | "Finalized";

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

type MondayPerson = {
  id: string;
  name?: string;
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
  boardPeople: Array<MondayPerson>;
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

function getDeleteColumnQuery(boardId: string) {
  return `mutation DeleteNpuVotingReportColumn($columnId: String!) {
    delete_column(
      board_id: ${assertNumericId(boardId, "boardId")}
      column_id: $columnId
    ) {
      id
    }
  }`;
}

function getMondayStatusLabel(status: StoredVotingReport["status"]): MondayReportStatusLabel {
  if (status === "changes_requested") {
    return "Changes Requested";
  }

  if (status === "finalized") {
    return "Finalized";
  }

  return "Submitted for Review";
}

function getMondayGroupId(
  boardConfig: MondayVotingReportBoardConfig,
  statusLabel: MondayReportStatusLabel,
) {
  if (statusLabel === "Changes Requested") {
    return boardConfig.groups.changesRequested.id;
  }

  if (statusLabel === "Finalized") {
    return boardConfig.groups.finalized.id;
  }

  return boardConfig.groups.submittedForReview.id;
}

function formatDateColumnValue(isoOrDate: string) {
  return { date: isoOrDate.split("T")[0] };
}

function getMondayItemName(report: StoredVotingReport) {
  return `Report: NPU ${report.report.npu} - ${report.report.meetingDate || "Pending"}`;
}

function getRequiredBoardGroup(
  groups: Array<MondayGroup>,
  group: (typeof MONDAY_BOARD_GROUPS)[number],
) {
  const matchedGroup = groups.find((candidate) => candidate.title === group.title);
  if (!matchedGroup) {
    throw new Error(`monday.com board is missing required group "${group.title}".`);
  }

  return matchedGroup;
}

function findBoardColumn(
  columns: Array<MondayColumn>,
  title: string,
  type?: string,
) {
  return columns.find(
    (candidate) => candidate.title === title && (!type || candidate.type === type),
  );
}

function getRequiredBoardColumn(
  columns: Array<MondayColumn>,
  title: string,
  type?: string,
) {
  const matchedColumn = findBoardColumn(columns, title, type);
  if (!matchedColumn) {
    throw new Error(`monday.com board is missing required column "${title}".`);
  }

  return matchedColumn;
}

function getPeopleColumnValue(people: Array<MondayPerson>) {
  const personsAndTeams = people
    .filter((person) => /^\d+$/.test(person.id))
    .map((person) => ({ id: Number(person.id), kind: "person" }));

  return personsAndTeams.length ? { personsAndTeams } : {};
}

function normalizeMondayPeople(people?: Array<MondayPerson> | null) {
  const seen = new Set<string>();
  const normalizedPeople: Array<MondayPerson> = [];

  for (const person of people ?? []) {
    if (!person.id || seen.has(person.id)) {
      continue;
    }

    seen.add(person.id);
    normalizedPeople.push(person);
  }

  return normalizedPeople;
}

function getReportColumnValues(
  boardConfig: MondayVotingReportBoardConfig,
  report: StoredVotingReport,
) {
  const appUrl = getPublicAppUrl();
  const statusLabel = getMondayStatusLabel(report.status);
  const printUrl = `${appUrl}/reports/${report.id}/print`;
  const columnValues: Record<string, unknown> = {
    [boardConfig.columns.npu.id]: report.report.npu,
    [boardConfig.columns.meetingDate.id]: formatDateColumnValue(
      report.report.meetingDate || new Date().toISOString(),
    ),
    [boardConfig.columns.planner.id]: report.report.planner,
    [boardConfig.columns.chair.id]: report.report.chair,
    [boardConfig.columns.plannerEmail.id]: report.plannerEmail
      ? {
          email: report.plannerEmail,
          text: report.plannerEmail,
        }
      : {},
    [boardConfig.columns.chairEmail.id]: report.chairEmail
      ? {
          email: report.chairEmail,
          text: report.chairEmail,
        }
      : {},
    [boardConfig.columns.npuTeamEmail.id]: report.npuTeamEmail
      ? {
          email: report.npuTeamEmail,
          text: report.npuTeamEmail,
        }
      : {},
    [boardConfig.columns.submittedAt.id]: formatDateColumnValue(
      report.submittedAt || report.createdAt,
    ),
    [boardConfig.columns.finalizedAt.id]: report.finalizedAt
      ? formatDateColumnValue(report.finalizedAt)
      : {},
    [boardConfig.columns.agendaItemCount.id]: String(report.report.items.length),
    [boardConfig.columns.reportLink.id]: {
      url: `${appUrl}/dashboard/${report.id}`,
      text: "View Dashboard",
    },
    [boardConfig.columns.pdfLink.id]: {
      url: printUrl,
      text: "Print / Download PDF",
    },
    [boardConfig.columns.people.id]: getPeopleColumnValue(boardConfig.boardPeople),
    [boardConfig.columns.reportStatus.id]: { label: statusLabel },
    [boardConfig.columns.plannerNotes.id]: { text: report.report.plannerNotes },
  };

  return { columnValues, statusLabel };
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

async function getOrCreateMondayColumn(
  clientOptions: MondayClientOptions,
  boardId: string,
  existingColumns: Array<MondayColumn>,
  column: (typeof MONDAY_BOARD_COLUMNS)[number],
) {
  const existingColumn = findBoardColumn(existingColumns, column.title, column.type);
  if (existingColumn) {
    return existingColumn;
  }

  const createdColumn = await createMondayColumn(clientOptions, boardId, column);
  existingColumns.push(createdColumn);
  return createdColumn;
}

async function deleteMondayColumn(
  clientOptions: MondayClientOptions,
  boardId: string,
  columnId: string,
) {
  await mondayQuery<{ delete_column: { id: string } }>(
    clientOptions,
    getDeleteColumnQuery(boardId),
    { columnId },
  );
}

async function deleteRetiredMondayColumns(
  clientOptions: MondayClientOptions,
  boardId: string,
  columns: Array<MondayColumn>,
) {
  for (const retiredColumn of RETIRED_MONDAY_BOARD_COLUMNS) {
    const matchedColumn = findBoardColumn(columns, retiredColumn.title, retiredColumn.type);
    if (!matchedColumn) {
      continue;
    }

    try {
      await deleteMondayColumn(clientOptions, boardId, matchedColumn.id);
    } catch (error) {
      console.warn(`Unable to delete retired monday.com column "${retiredColumn.title}":`, error);
    }
  }
}

async function getMondayBoardPeople(clientOptions: MondayClientOptions, boardId: string) {
  const query = `query GetNpuVotingReportBoardOwners($boardId: ID!) {
    boards(ids: [$boardId]) {
      owners {
        id
        name
      }
    }
  }`;

  try {
    const data = await mondayQuery<{
      boards: Array<{ owners?: Array<MondayPerson> }>;
    }>(clientOptions, query, {
      boardId: assertNumericId(boardId, "boardId"),
    });

    return normalizeMondayPeople(data.boards[0]?.owners);
  } catch (error) {
    console.warn("Unable to read monday.com board owners for People column:", error);
    return [];
  }
}

async function getMondayBoardSubscribers(clientOptions: MondayClientOptions, boardId: string) {
  const query = `query GetNpuVotingReportBoardSubscribers($boardId: ID!) {
    boards(ids: [$boardId]) {
      subscribers {
        id
        name
      }
    }
  }`;

  try {
    const data = await mondayQuery<{
      boards: Array<{ subscribers?: Array<MondayPerson> }>;
    }>(clientOptions, query, {
      boardId: assertNumericId(boardId, "boardId"),
    });

    return normalizeMondayPeople(data.boards[0]?.subscribers);
  } catch (error) {
    console.warn("Unable to read monday.com board subscribers for People column:", error);
    return [];
  }
}

async function getMondayBoardPeopleWithAccess(
  clientOptions: MondayClientOptions,
  boardId: string,
  owners?: Array<MondayPerson>,
) {
  const boardOwners = owners
    ? normalizeMondayPeople(owners)
    : await getMondayBoardPeople(clientOptions, boardId);
  const subscribers = await getMondayBoardSubscribers(clientOptions, boardId);
  return normalizeMondayPeople([...boardOwners, ...subscribers]);
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

  const boardPeople = await getMondayBoardPeopleWithAccess(clientOptions, board.id);

  return {
    board,
    groups,
    columns,
    boardPeople,
  };
}

export async function getMondayVotingReportBoardConfig(
  boardId: string,
): Promise<MondayVotingReportBoardConfig | null> {
  const appEnv = getAppEnv();
  const token = appEnv.MONDAY_API_TOKEN;
  if (!token) {
    console.warn("MONDAY_API_TOKEN is not configured, skipping monday board lookup.");
    return null;
  }

  const clientOptions = {
    token,
    apiVersion: appEnv.MONDAY_API_VERSION || DEFAULT_MONDAY_API_VERSION,
  };
  const query = `query GetNpuVotingReportBoard($boardId: ID!) {
    boards(ids: [$boardId]) {
      id
      name
      url
      groups {
        id
        title
        color
      }
      columns {
        id
        title
        type
      }
      owners {
        id
        name
      }
    }
  }`;
  const data = await mondayQuery<{
    boards: Array<
      MondayBoard & {
        groups: Array<MondayGroup>;
        columns: Array<MondayColumn>;
        owners?: Array<MondayPerson>;
      }
    >;
  }>(clientOptions, query, {
    boardId: assertNumericId(boardId, "MONDAY_BOARD_ID"),
  });
  const board = data.boards[0];
  if (!board) {
    throw new Error(`monday.com board ${boardId} was not found.`);
  }

  const groups = {} as Record<MondayBoardGroupKey, MondayGroup>;
  for (const group of MONDAY_BOARD_GROUPS) {
    groups[group.key] = getRequiredBoardGroup(board.groups, group);
  }

  await deleteRetiredMondayColumns(clientOptions, board.id, board.columns);

  const columns = {
    reportStatus: getRequiredBoardColumn(board.columns, "Report Status", "status"),
  } as Record<MondayBoardColumnKey, MondayColumn>;
  for (const column of MONDAY_BOARD_COLUMNS) {
    columns[column.key] = await getOrCreateMondayColumn(
      clientOptions,
      board.id,
      board.columns,
      column,
    );
  }

  return {
    board: {
      id: board.id,
      name: board.name,
      url: board.url,
    },
    groups,
    columns,
    boardPeople: await getMondayBoardPeopleWithAccess(clientOptions, board.id, board.owners),
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

export async function updateMondayItemColumns(
  clientOptions: MondayClientOptions,
  boardId: string,
  itemId: string,
  columnValues: Record<string, unknown>,
) {
  const query = `mutation UpdateItemColumns($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
    change_multiple_column_values(
      board_id: $boardId
      item_id: $itemId
      column_values: $columnValues
    ) {
      id
    }
  }`;

  const data = await mondayQuery<{ change_multiple_column_values: { id: string } }>(
    clientOptions,
    query,
    {
      boardId,
      itemId,
      columnValues: JSON.stringify(columnValues),
    },
  );

  return data.change_multiple_column_values.id;
}

async function moveMondayItemToGroup(
  clientOptions: MondayClientOptions,
  itemId: string,
  groupId: string,
) {
  const query = `mutation MoveItem($itemId: ID!, $groupId: String!) {
    move_item_to_group(
      item_id: $itemId,
      group_id: $groupId
    ) {
      id
    }
  }`;

  await mondayQuery(clientOptions, query, {
    itemId,
    groupId,
  });
}

export async function pushReportToMonday(
  boardConfig: MondayVotingReportBoardConfig,
  report: StoredVotingReport,
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

  const { columnValues, statusLabel } = getReportColumnValues(boardConfig, report);
  const groupId = getMondayGroupId(boardConfig, statusLabel);
  const existingItemId = report.mondayItemId;

  const itemId = existingItemId
    ? await updateMondayItemColumns(
        clientOptions,
        boardConfig.board.id,
        existingItemId,
        columnValues,
      )
    : await createMondayItem(
        clientOptions,
        boardConfig.board.id,
        groupId,
        getMondayItemName(report),
        columnValues,
      );

  if (existingItemId) {
    await moveMondayItemToGroup(clientOptions, itemId, groupId);
  }

  return itemId;
}
