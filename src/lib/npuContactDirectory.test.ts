import { describe, expect, it } from "vitest";

import { NPU_OPTIONS } from "@/lib/votingReport";
import {
  NPU_CONTACT_DEFAULTS,
  NPU_CONTACT_SOURCE,
  getNpuContactDefault,
} from "@/lib/npuContactDirectory";
import { getSubmissionRecipients } from "@/server/npuContacts";

describe("NPU contact directory", () => {
  it("has editable-safe chair and planner defaults for every supported NPU", () => {
    expect(Object.keys(NPU_CONTACT_DEFAULTS).sort()).toEqual([...NPU_OPTIONS].sort());

    for (const npu of NPU_OPTIONS) {
      const contact = getNpuContactDefault(npu);
      expect(contact?.chairName).toBeTruthy();
      expect(contact?.plannerName).toBeTruthy();
    }
  });

  it("uses the 2026 internal contact list metadata", () => {
    expect(NPU_CONTACT_SOURCE).toMatchObject({
      version: "2026",
      revisedOn: "2026-04-13",
      expiresOn: "2026-12-31",
    });
  });

  it("resolves server-only submission recipients by NPU", () => {
    expect(getSubmissionRecipients("A", "npu-team@atlantaga.gov")).toEqual({
      chairEmail: "wbdnatl@gmail.com",
      plannerEmail: "rkkaushik@atlantaga.gov",
      npuTeamEmail: "npu-team@atlantaga.gov",
    });
    expect(getSubmissionRecipients("B", "npu-team@atlantaga.gov")).toMatchObject({
      chairEmail: "chair@npu-b.com",
      plannerEmail: "",
    });
  });
});
