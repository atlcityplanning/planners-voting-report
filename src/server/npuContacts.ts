import { NPU_CONTACT_SOURCE, getNpuContactDefault, isNpuOption } from "@/lib/npuContactDirectory";
import type { NpuOption } from "@/lib/npuContactDirectory";
import type { SubmissionRecipients } from "@/lib/votingReportWorkflow";

type NpuPrivateContact = {
  npu: NpuOption;
  chairEmail: string;
  plannerEmail: string;
};

const NPU_PRIVATE_CONTACTS: Record<NpuOption, NpuPrivateContact> = {
  A: { npu: "A", chairEmail: "wbdnatl@gmail.com", plannerEmail: "rkkaushik@atlantaga.gov" },
  B: { npu: "B", chairEmail: "chair@npu-b.com", plannerEmail: "" },
  C: { npu: "C", chairEmail: "zgober@lavista.com", plannerEmail: "tjordan-madden@atlantaga.gov" },
  D: { npu: "D", chairEmail: "james.martin@me.gatech.edu", plannerEmail: "nhoelzel@atlantaga.gov" },
  E: { npu: "E", chairEmail: "agenda@npueatlanta.org", plannerEmail: "khernandez@atlantaga.gov" },
  F: { npu: "F", chairEmail: "chair@npufatlanta.org", plannerEmail: "dyoung@atlantaga.gov" },
  G: { npu: "G", chairEmail: "chair@npugatlanta.org", plannerEmail: "natcarson@atlantaga.gov" },
  H: { npu: "H", chairEmail: "npuhwestatlanta@gmail.com", plannerEmail: "tiawilliams@atlantaga.gov" },
  I: { npu: "I", chairEmail: "npuichair2024@gmail.com", plannerEmail: "sucoleman@atlantaga.gov" },
  J: { npu: "J", chairEmail: "chair@npujatlanta.com", plannerEmail: "kmholmes@atlantaga.gov" },
  K: { npu: "K", chairEmail: "npukatlanta@gmail.com", plannerEmail: "jstaples@atlantaga.gov" },
  L: { npu: "L", chairEmail: "chair@npulatlanta.org", plannerEmail: "ngallentine@atlantaga.gov" },
  M: { npu: "M", chairEmail: "chair@npumatlanta.org", plannerEmail: "jswindle@atlantaga.gov" },
  N: { npu: "N", chairEmail: "npunchair@gmail.com", plannerEmail: "tletang@atlantaga.gov" },
  O: { npu: "O", chairEmail: "chair@atlantanpuo.org", plannerEmail: "sxayavong@atlantaga.gov" },
  P: { npu: "P", chairEmail: "drfayefloyd@me.com", plannerEmail: "kbakari@atlantaga.gov" },
  Q: { npu: "Q", chairEmail: "davget_smith@hotmail.com", plannerEmail: "franrozier@atlantaga.gov" },
  R: { npu: "R", chairEmail: "npur.exc@gmail.com", plannerEmail: "bwismer@atlantaga.gov" },
  S: { npu: "S", chairEmail: "chair@npu-s.org", plannerEmail: "cmgarcia@atlantaga.gov" },
  T: { npu: "T", chairEmail: "chair@nputatlanta.com", plannerEmail: "mbforte@atlantaga.gov" },
  V: { npu: "V", chairEmail: "chbarringer@gmail.com", plannerEmail: "ngandhi@atlantaga.gov" },
  W: { npu: "W", chairEmail: "leadership@npu-w.org", plannerEmail: "saceto@atlantaga.gov" },
  X: { npu: "X", chairEmail: "chair@npu-x.com", plannerEmail: "aewilliams@atlantaga.gov" },
  Y: { npu: "Y", chairEmail: "chair@npuy.org", plannerEmail: "eaclappin@atlantaga.gov" },
  Z: { npu: "Z", chairEmail: "aphillipscitybusiness@gmail.com", plannerEmail: "totoo@atlantaga.gov" },
};

export function getPrivateNpuContact(npu: string): NpuPrivateContact | null {
  if (!isNpuOption(npu)) {
    return null;
  }

  return NPU_PRIVATE_CONTACTS[npu];
}

export function getSubmissionRecipients(
  npu: string,
  npuTeamEmail: string,
): SubmissionRecipients {
  const privateContact = getPrivateNpuContact(npu);

  return {
    chairEmail: privateContact?.chairEmail ?? "",
    plannerEmail: privateContact?.plannerEmail ?? "",
    npuTeamEmail,
  };
}

export function getContactSnapshot(npu: string) {
  const defaults = getNpuContactDefault(npu);
  const privateContact = getPrivateNpuContact(npu);

  return {
    sourceVersion: NPU_CONTACT_SOURCE.version,
    chairName: defaults?.chairName ?? "",
    plannerName: defaults?.plannerName ?? "",
    chairEmail: privateContact?.chairEmail ?? "",
    plannerEmail: privateContact?.plannerEmail ?? "",
  };
}
