import {
  ChevronDown,
  Clipboard,
  ExternalLink,
  GripVertical,
  MessageSquarePlus,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, FocusEvent, FormEvent, KeyboardEvent } from "react";
import {
  INITIAL_REPORT_STATE,
  ITEM_TYPES,
  NPU_OPTIONS,
  RECOMMENDATIONS,
  applyApplicationTemplate,
  getApplicationDefaults,
  getPlannerScriptUrl,
  getReportPrintLabels,
  normalizeItemType,
  normalizeRecommendation,
  reorderItems,
} from "@/lib/votingReport";
import type { AgendaItem, ItemType, Recommendation, ReportFormState } from "@/lib/votingReport";
import { cn } from "@/utils/cn";

const STORAGE_KEY = "npu-voting-report:v1";
const UPDATES_URL =
  "https://www.atlantaga.gov/government/departments/city-planning/neighborhood-planning-units/updates";

type NewItemForm = {
  itemType: ItemType | "";
  applicationName: string;
  recommendation: Recommendation;
  comments: string;
};

const EMPTY_NEW_ITEM: NewItemForm = {
  itemType: "",
  applicationName: "",
  recommendation: "PENDING",
  comments: "",
};

const labelClass = "text-[10px] font-bold uppercase tracking-wide text-muted-foreground";
const printLabelClass = `${labelClass} print:text-black`;
const sectionHeadingClass = "m-0 text-base font-extrabold text-foreground print:text-black";
const reportPanelClass =
  "mb-4 rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-sm ring-1 ring-border print:mb-4 print:rounded-none print:p-0 print:shadow-none print:ring-0";
const screenPanelClass =
  "mb-4 rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-sm ring-1 ring-border print:hidden";
const fieldClass =
  "min-h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15 print:min-h-0 print:border-0 print:bg-transparent print:p-0 print:shadow-none print:ring-0";
const selectFieldClass = cn(fieldClass, "appearance-none pr-10");
const screenFieldClass =
  "min-h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15";
const subtleButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-colors hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20";
const inlineEditClass =
  "w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-foreground outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/15 print:border-0 print:bg-transparent print:p-0 print:ring-0";
const iconButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors focus:outline-none focus:ring-4 focus:ring-primary/15";

function createItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sanitizeItem(item: unknown): AgendaItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const candidate = item as Partial<AgendaItem>;
  const itemType = normalizeItemType(readString(candidate.itemType));
  const applicationName = readString(candidate.applicationName).trim();

  if (!applicationName) {
    return null;
  }

  return {
    id: readString(candidate.id) || createItemId(),
    itemType,
    applicationName,
    recommendation: normalizeRecommendation(readString(candidate.recommendation)),
    comments: readString(candidate.comments),
  };
}

function sanitizeReport(candidate: Partial<ReportFormState>): ReportFormState {
  const items = Array.isArray(candidate.items)
    ? candidate.items.map(sanitizeItem).filter((item) => item !== null)
    : [];

  return {
    ...INITIAL_REPORT_STATE,
    npu: readString(candidate.npu) || INITIAL_REPORT_STATE.npu,
    chair: readString(candidate.chair),
    location: readString(candidate.location),
    planner: readString(candidate.planner),
    meetingDate: readString(candidate.meetingDate),
    autofill:
      typeof candidate.autofill === "boolean" ? candidate.autofill : INITIAL_REPORT_STATE.autofill,
    plannerNotes: readString(candidate.plannerNotes),
    items,
  };
}

function parseLegacyItems(serializedItems: string | null): Array<AgendaItem> {
  if (!serializedItems || typeof DOMParser === "undefined") {
    return [];
  }

  try {
    const html = JSON.parse(serializedItems) as unknown;
    if (typeof html !== "string") {
      return [];
    }

    const documentFragment = new DOMParser().parseFromString(`<table>${html}</table>`, "text/html");

    return Array.from(documentFragment.querySelectorAll("tbody"))
      .map((body) => {
        const rows = Array.from(body.querySelectorAll("tr"));
        const cells = Array.from(rows[0]?.querySelectorAll("td") ?? []);
        const applicationName = cells[1]?.textContent?.trim() ?? "";

        if (!applicationName) {
          return null;
        }

        return {
          id: createItemId(),
          itemType: normalizeItemType(cells[0]?.textContent?.trim() ?? ""),
          applicationName,
          recommendation: normalizeRecommendation(cells[2]?.textContent?.trim() ?? "PENDING"),
          comments: rows[1]?.textContent?.trim() ?? "",
        };
      })
      .filter((item) => item !== null);
  } catch {
    return [];
  }
}

function loadStoredReport(): ReportFormState {
  if (typeof window === "undefined") {
    return INITIAL_REPORT_STATE;
  }

  const storedReport = window.localStorage.getItem(STORAGE_KEY);
  if (storedReport) {
    try {
      return sanitizeReport(JSON.parse(storedReport) as Partial<ReportFormState>);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  try {
    const legacyData = JSON.parse(window.localStorage.getItem("data") ?? "{}") as Record<
      string,
      unknown
    >;

    return sanitizeReport({
      npu: readString(legacyData.NPU),
      chair: readString(legacyData.chair),
      location: readString(legacyData.loc),
      planner: readString(legacyData.planner),
      autofill:
        typeof legacyData.fillToggle === "boolean"
          ? legacyData.fillToggle
          : INITIAL_REPORT_STATE.autofill,
      plannerNotes: window.localStorage.getItem("pNotes") ?? "",
      items: parseLegacyItems(window.localStorage.getItem("items")),
    });
  } catch {
    return INITIAL_REPORT_STATE;
  }
}

export default function VotingReportForm() {
  const [report, setReport] = useState<ReportFormState>(INITIAL_REPORT_STATE);
  const [newItem, setNewItem] = useState<NewItemForm>(EMPTY_NEW_ITEM);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dialogMessage, setDialogMessage] = useState("");
  const [copiedUpdatesLink, setCopiedUpdatesLink] = useState(false);
  const [openCommentIds, setOpenCommentIds] = useState<Array<string>>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const printLabels = useMemo(
    () => getReportPrintLabels(report.npu, report.meetingDate),
    [report.meetingDate, report.npu],
  );
  const plannerScriptUrl = useMemo(() => getPlannerScriptUrl(report.npu), [report.npu]);
  const pendingCount = useMemo(
    () => report.items.filter((item) => item.recommendation === "PENDING").length,
    [report.items],
  );
  const reportTitle = report.meetingDate ? printLabels.headerTitle : "VOTING REPORT";

  useEffect(() => {
    setReport(loadStoredReport());
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  }, [hasLoadedStorage, report]);

  useEffect(() => {
    if (!copiedUpdatesLink) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedUpdatesLink(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [copiedUpdatesLink]);

  useEffect(() => {
    function beforePrint() {
      if (report.meetingDate) {
        document.title = printLabels.documentTitle;
      }
    }

    function afterPrint() {
      document.title = "NPU Planner's Voting Report";
    }

    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);

    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [printLabels.documentTitle, report.meetingDate]);

  function showDialog(message: string) {
    setDialogMessage(message);
    window.requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function updateReportField<K extends keyof ReportFormState>(field: K, value: ReportFormState[K]) {
    setReport((currentReport) => ({
      ...currentReport,
      [field]: value,
    }));
  }

  function updateItem(id: string, patch: Partial<AgendaItem>) {
    setReport((currentReport) => ({
      ...currentReport,
      items: currentReport.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function handleAutofillChange(autofill: boolean) {
    updateReportField("autofill", autofill);
    setNewItem((currentItem) => {
      if (!currentItem.itemType) {
        return currentItem;
      }

      const defaults = getApplicationDefaults(currentItem.itemType, autofill);
      return {
        ...currentItem,
        applicationName: defaults.value,
        recommendation: defaults.recommendation ?? currentItem.recommendation,
      };
    });
  }

  function handleNewItemTypeChange(itemTypeValue: string) {
    const itemType = normalizeItemType(itemTypeValue);
    const defaults = getApplicationDefaults(itemType, report.autofill);

    setNewItem({
      itemType,
      applicationName: defaults.value,
      recommendation: defaults.recommendation ?? "PENDING",
      comments: "",
    });
  }

  function handleNewApplicationName(value: string) {
    const defaults = getApplicationDefaults(newItem.itemType, report.autofill);
    setNewItem((currentItem) => ({
      ...currentItem,
      applicationName: applyApplicationTemplate(value, defaults.template, report.autofill),
    }));
  }

  function moveCursorToEnd(event: FocusEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    window.requestAnimationFrame(() => {
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newItem.itemType || !newItem.applicationName.trim()) {
      showDialog("Please enter an item type and application name.");
      return;
    }

    const item: AgendaItem = {
      id: createItemId(),
      itemType: newItem.itemType,
      applicationName: newItem.applicationName.trim(),
      recommendation: newItem.recommendation,
      comments: newItem.comments.trim(),
    };

    setReport((currentReport) => ({
      ...currentReport,
      items: [...currentReport.items, item],
    }));
    setNewItem(EMPTY_NEW_ITEM);
  }

  function handleClearTable() {
    if (report.items.length > 0 && !window.confirm("Clear all agenda items and planner notes?")) {
      return;
    }

    setReport((currentReport) => ({
      ...currentReport,
      items: [],
      plannerNotes: "",
    }));
    setOpenCommentIds([]);
  }

  function handleDeleteItem(itemId: string) {
    if (!window.confirm("Delete this agenda item?")) {
      return;
    }

    setReport((currentReport) => ({
      ...currentReport,
      items: currentReport.items.filter((item) => item.id !== itemId),
    }));
  }

  function handleApplicationKeyDown(item: AgendaItem, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Tab" && !item.comments.trim()) {
      openCommentEditor(item.id);
    }
  }

  function openCommentEditor(itemId: string) {
    setOpenCommentIds((currentIds) =>
      currentIds.includes(itemId) ? currentIds : [...currentIds, itemId],
    );
  }

  function closeEmptyCommentEditor(item: AgendaItem) {
    if (item.comments.trim()) {
      return;
    }

    setOpenCommentIds((currentIds) => currentIds.filter((itemId) => itemId !== item.id));
  }

  function handleDragStart(itemId: string, event: DragEvent<HTMLElement>) {
    setDraggingId(itemId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(overId: string, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const activeId = draggingId ?? event.dataTransfer.getData("text/plain");

    if (!activeId) {
      return;
    }

    setReport((currentReport) => ({
      ...currentReport,
      items: reorderItems(currentReport.items, activeId, overId),
    }));
    setDraggingId(null);
  }

  async function copyUpdatesLink() {
    try {
      await navigator.clipboard.writeText(UPDATES_URL);
      setCopiedUpdatesLink(true);
    } catch {
      showDialog("Unable to copy the updates link from this browser.");
    }
  }

  function handlePrint() {
    if (!report.meetingDate) {
      dateInputRef.current?.focus();
      dateInputRef.current?.showPicker?.();
      return;
    }

    if (
      pendingCount > 0 &&
      !window.confirm("Some items do not have recommendations. Print the report anyway?")
    ) {
      return;
    }

    window.print();
  }

  return (
    <main className="mx-auto w-[min(1180px,calc(100%-2rem))] py-8 print:w-full print:py-0">
      <dialog
        ref={dialogRef}
        className="w-[min(26rem,calc(100%-2rem))] rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl backdrop:bg-foreground/40"
      >
        <p className="m-0 mb-4 text-sm text-muted-foreground">{dialogMessage}</p>
        <button
          type="button"
          className={subtleButtonClass}
          onClick={() => dialogRef.current?.close()}
        >
          OK
        </button>
      </dialog>

      <header className="mb-6 print:mb-6">
        <img
          src="/npu-logo-black.png"
          alt="City of Atlanta Department of City Planning Neighborhood Planning Units"
          className="mx-auto mb-8 block w-[min(760px,90%)] object-contain print:mb-6 print:w-[4.8in]"
        />
        <div className="grid items-center gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground print:text-black">
              City of Atlanta Department of City Planning
            </p>
            <h1
              id="report-heading"
              className="m-0 font-display text-5xl font-semibold uppercase leading-none tracking-normal text-foreground sm:text-6xl print:text-3xl"
            >
              {reportTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              className={cn(subtleButtonClass, "sm:min-w-32")}
              onClick={handleClearTable}
            >
              <RotateCcw aria-hidden="true" size={18} />
              Clear Table
            </button>
            <button
              type="button"
              className={cn(primaryButtonClass, "sm:min-w-24")}
              onClick={handlePrint}
            >
              <Printer aria-hidden="true" size={18} />
              Print
            </button>
          </div>
        </div>
      </header>

      <section
        className={reportPanelClass}
        aria-labelledby="page-info-heading"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="page-info-heading" className={sectionHeadingClass}>
            Report Details
          </h2>
          <span className="text-xs font-bold text-muted-foreground print:hidden">
            {hasLoadedStorage ? "Saved locally" : "Loading saved form"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(6rem,0.55fr)_repeat(2,minmax(12rem,1fr))] print:grid-cols-2 print:gap-x-8 print:gap-y-2">
          <label className="grid gap-1 print:grid-cols-[max-content_1fr] print:items-baseline print:gap-2">
            <span className={printLabelClass}>NPU</span>
            <span className="relative block">
              <select
                className={selectFieldClass}
                value={report.npu}
                onChange={(event) => updateReportField("npu", event.target.value)}
              >
                {NPU_OPTIONS.map((npu) => (
                  <option key={npu} value={npu}>
                    {npu}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground print:hidden"
              />
            </span>
          </label>
          <label className="grid gap-1 print:grid-cols-[max-content_1fr] print:items-baseline print:gap-2">
            <span className={printLabelClass}>Chair</span>
            <input
              className={fieldClass}
              value={report.chair}
              onChange={(event) => updateReportField("chair", event.target.value)}
              type="text"
            />
          </label>
          <label className="grid gap-1 print:grid-cols-[max-content_1fr] print:items-baseline print:gap-2">
            <span className={printLabelClass}>Meeting Date</span>
            <input
              ref={dateInputRef}
              className={fieldClass}
              value={report.meetingDate}
              onChange={(event) => updateReportField("meetingDate", event.target.value)}
              type="date"
              required
            />
          </label>
          <label className="grid gap-1 print:grid-cols-[max-content_1fr] print:items-baseline print:gap-2">
            <span className={printLabelClass}>Location</span>
            <input
              className={fieldClass}
              value={report.location}
              onChange={(event) => updateReportField("location", event.target.value)}
              type="text"
            />
          </label>
          <label className="grid gap-1 print:grid-cols-[max-content_1fr] print:items-baseline print:gap-2">
            <span className={printLabelClass}>Planner</span>
            <input
              className={fieldClass}
              value={report.planner}
              onChange={(event) => updateReportField("planner", event.target.value)}
              type="text"
            />
          </label>
          <label className="grid grid-cols-[1fr_auto] items-end gap-3 print:hidden">
            <span className="self-center text-sm font-bold text-foreground">
              Autofill application numbers
            </span>
            <input
              className="relative h-7 w-12 appearance-none rounded-full border border-input bg-muted p-0 transition checked:border-primary checked:bg-accent before:absolute before:left-1 before:top-1 before:h-5 before:w-5 before:rounded-full before:bg-muted-foreground before:transition checked:before:translate-x-5 checked:before:bg-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              checked={report.autofill}
              onChange={(event) => handleAutofillChange(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
      </section>

      <section
        className={screenPanelClass}
        aria-labelledby="new-item"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="new-item" className={sectionHeadingClass}>
            New Item
          </h2>
          {pendingCount > 0 ? (
            <span className="rounded-full bg-warning px-3 py-1 text-xs font-bold text-warning-foreground ring-1 ring-warning-foreground/20">
              {pendingCount} pending
            </span>
          ) : null}
        </div>

        <form
          className="grid items-end gap-3 lg:grid-cols-[minmax(8rem,0.75fr)_minmax(14rem,2fr)_minmax(12rem,1fr)_auto]"
          onSubmit={handleAddItem}
        >
          <label className="grid gap-1">
            <span className={labelClass}>Type</span>
            <select
              className={screenFieldClass}
              value={newItem.itemType}
              onChange={(event) => handleNewItemTypeChange(event.target.value)}
              required
            >
              <option value="" disabled>
                Type
              </option>
              {ITEM_TYPES.map((itemType) => (
                <option key={itemType.value} value={itemType.value}>
                  {itemType.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1">
            <span className={labelClass}>Application # / Name</span>
            <input
              className={screenFieldClass}
              value={newItem.applicationName}
              onChange={(event) => handleNewApplicationName(event.target.value)}
              onFocus={moveCursorToEnd}
              placeholder={
                newItem.itemType
                  ? getApplicationDefaults(newItem.itemType, report.autofill).placeholder
                  : "Application number or name"
              }
              type="text"
              autoComplete="off"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>Recommendation</span>
            <select
              className={screenFieldClass}
              value={newItem.recommendation}
              onChange={(event) =>
                setNewItem((currentItem) => ({
                  ...currentItem,
                  recommendation: normalizeRecommendation(event.target.value),
                }))
              }
            >
              {RECOMMENDATIONS.map((recommendation) => (
                <option
                  key={recommendation.value}
                  value={recommendation.value}
                  disabled={recommendation.value === "PENDING"}
                >
                  {recommendation.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 lg:col-span-4">
            <span className={labelClass}>Comments / Conditions</span>
            <textarea
              className={cn(screenFieldClass, "min-h-20 resize-y")}
              value={newItem.comments}
              onChange={(event) =>
                setNewItem((currentItem) => ({
                  ...currentItem,
                  comments: event.target.value,
                }))
              }
              rows={2}
            />
          </label>
          <button
            type="submit"
            className={cn(primaryButtonClass, "w-full px-5 lg:w-auto lg:min-w-36")}
          >
            <Plus aria-hidden="true" size={18} />
            Add to Table
          </button>
        </form>
      </section>

      <section
        className="mb-4 overflow-hidden rounded-2xl bg-card text-sm text-muted-foreground shadow-sm ring-1 ring-border print:mb-4 print:rounded-none print:shadow-none print:ring-0"
        aria-labelledby="agenda-heading"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border p-4 print:border-0 print:p-0 print:pb-2">
          <h2 id="agenda-heading" className={sectionHeadingClass}>
            Agenda Items
          </h2>
          <span className="text-xs font-bold text-muted-foreground print:text-black">
            {report.items.length} total
          </span>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[760px] table-fixed border-collapse print:min-w-0 print:text-[10pt]">
            <thead className="bg-muted">
              <tr>
                <th className="w-36 border-b border-border px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground print:border print:border-neutral-600 print:px-2 print:py-1 print:text-black">
                  Type
                </th>
                <th className="border-b border-border px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground print:border print:border-neutral-600 print:px-2 print:py-1 print:text-black">
                  Application # / Name
                </th>
                <th className="w-56 border-b border-border px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground print:border print:border-neutral-600 print:px-2 print:py-1 print:text-black">
                  NPU Recommendation
                </th>
                <th className="w-28 border-b border-border px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground print:hidden">
                  Actions
                </th>
              </tr>
            </thead>
            {report.items.length === 0 ? (
              <tbody>
                <tr>
                  <td
                    className="h-20 border-b border-border px-3 py-3 text-center text-muted-foreground print:border print:border-neutral-600 print:px-2 print:py-1"
                    colSpan={4}
                  >
                    No agenda items added.
                  </td>
                </tr>
              </tbody>
            ) : (
              report.items.map((item) => {
                const showComments = item.comments.trim() || openCommentIds.includes(item.id);

                return (
                  <tbody
                    key={item.id}
                    className={cn(
                      "break-inside-avoid odd:bg-card even:bg-muted/60",
                      draggingId === item.id && "opacity-50",
                    )}
                    draggable
                    onDragStart={(event) => handleDragStart(item.id, event)}
                    onDragOver={handleDragOver}
                    onDrop={(event) => handleDrop(item.id, event)}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <tr>
                      <td className="border-b border-border px-3 py-2 font-extrabold text-foreground print:border print:border-neutral-600 print:px-2 print:py-1">
                        <span className="flex cursor-grab items-center gap-1.5 active:cursor-grabbing print:cursor-default">
                          <GripVertical
                            aria-hidden="true"
                            className="text-muted-foreground print:hidden"
                            size={18}
                          />
                          <span>{item.itemType}</span>
                        </span>
                      </td>
                      <td className="border-b border-border px-3 py-2 print:border print:border-neutral-600 print:px-2 print:py-1">
                        <input
                          className={inlineEditClass}
                          value={item.applicationName}
                          onChange={(event) =>
                            updateItem(item.id, {
                              applicationName: event.target.value,
                            })
                          }
                          onKeyDown={(event) => handleApplicationKeyDown(item, event)}
                          aria-label={`Application name for ${item.itemType}`}
                        />
                      </td>
                      <td className="border-b border-border px-3 py-2 text-right print:border print:border-neutral-600 print:px-2 print:py-1">
                        <select
                          className={cn(
                            inlineEditClass,
                            "text-right",
                            item.recommendation === "PENDING"
                              ? "font-bold text-warning-foreground"
                              : "text-foreground",
                          )}
                          value={item.recommendation}
                          onChange={(event) =>
                            updateItem(item.id, {
                              recommendation: normalizeRecommendation(event.target.value),
                            })
                          }
                          aria-label={`Recommendation for ${item.applicationName}`}
                        >
                          {RECOMMENDATIONS.map((recommendation) => (
                            <option key={recommendation.value} value={recommendation.value}>
                              {recommendation.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-border px-3 py-2 text-right print:hidden">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className={cn(iconButtonClass, "hover:border-primary/30 hover:bg-muted hover:text-primary")}
                            onClick={() => openCommentEditor(item.id)}
                            aria-label={`Add comments for ${item.applicationName}`}
                            title="Add comments"
                          >
                            <MessageSquarePlus aria-hidden="true" size={18} />
                          </button>
                          <button
                            type="button"
                            className={cn(iconButtonClass, "hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive")}
                            onClick={() => handleDeleteItem(item.id)}
                            aria-label={`Delete ${item.applicationName}`}
                            title="Delete item"
                          >
                            <Trash2 aria-hidden="true" size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {showComments ? (
                      <tr>
                        <td
                          colSpan={4}
                          className={
                            item.comments.trim()
                              ? "border-b border-border bg-muted px-3 py-2 print:border print:border-neutral-600 print:bg-white print:px-2 print:py-1"
                              : "border-b border-border bg-muted px-3 py-2 print:hidden"
                          }
                        >
                          <textarea
                            className={cn(inlineEditClass, "min-h-14 resize-y")}
                            value={item.comments}
                            onChange={(event) =>
                              updateItem(item.id, {
                                comments: event.target.value,
                              })
                            }
                            onBlur={() => closeEmptyCommentEditor(item)}
                            rows={2}
                            aria-label={`Comments for ${item.applicationName}`}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                );
              })
            )}
          </table>
        </div>
      </section>

      <section
        className={cn(reportPanelClass, "shadow-none")}
        aria-labelledby="notes"
      >
        <div className="mb-4 print:mb-2">
          <h2 id="notes" className={sectionHeadingClass}>
            Planner&apos;s Notes
          </h2>
        </div>
        <textarea
          className={cn(screenFieldClass, "min-h-28 resize-y print:hidden")}
          value={report.plannerNotes}
          onChange={(event) => updateReportField("plannerNotes", event.target.value)}
          rows={4}
          placeholder="Note any themes or discussions of concern to the NPU..."
        />
        {report.plannerNotes.trim() ? (
          <div className="hidden whitespace-pre-wrap text-sm leading-6 text-black print:block">
            {report.plannerNotes}
          </div>
        ) : null}
      </section>

      <section
        className="mt-4 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center print:hidden"
        aria-label="Report links"
      >
        <a
          href={plannerScriptUrl}
          className={cn(subtleButtonClass, "no-underline")}
          target="_blank"
          rel="noreferrer"
        >
          Planner's Script
          <ExternalLink aria-hidden="true" size={16} />
        </a>
        <a
          href={UPDATES_URL}
          className={cn(subtleButtonClass, "no-underline")}
          target="_blank"
          rel="noreferrer"
        >
          Updates Page
          <ExternalLink aria-hidden="true" size={16} />
        </a>
        <button
          type="button"
          className={subtleButtonClass}
          onClick={copyUpdatesLink}
        >
          <Clipboard aria-hidden="true" size={16} />
          {copiedUpdatesLink ? "Copied" : "Copy Updates Link"}
        </button>
      </section>

      <section className="mt-6 hidden grid-cols-2 gap-4 print:grid" aria-label="Signatures">
        <div className="rounded-lg border border-neutral-600 p-4">
          <label className="mt-2 block font-bold" htmlFor="chairS">
            Chair Signature:
          </label>
          <input
            className="w-full border-0 border-b border-neutral-700 bg-transparent"
            type="text"
            id="chairS"
          />
          <label className="mt-2 block font-bold" htmlFor="cDate">
            Date:
          </label>
          <input
            className="w-full border-0 border-b border-neutral-700 bg-transparent"
            type="text"
            id="cDate"
          />
        </div>
        <div className="rounded-lg border border-neutral-600 p-4">
          <label className="mt-2 block font-bold" htmlFor="plannerS">
            Planner Signature:
          </label>
          <input
            className="w-full border-0 border-b border-neutral-700 bg-transparent"
            type="text"
            id="plannerS"
          />
          <label className="mt-2 block font-bold" htmlFor="pDate">
            Date:
          </label>
          <input
            className="w-full border-0 border-b border-neutral-700 bg-transparent"
            type="text"
            id="pDate"
          />
        </div>
      </section>
    </main>
  );
}
