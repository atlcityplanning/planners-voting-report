import { afterEach, describe, expect, it, vi } from "vitest";

import { createReportId } from "@/lib/votingReportWorkflow";

describe("voting report workflow helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates short ULID-like report identifiers", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_780_495_704_673);

    const reportId = createReportId();

    expect(reportId).toHaveLength(16);
    expect(reportId).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/);
    expect(reportId.slice(0, 10)).toBe("01KT6X0RK1");
  });
});
