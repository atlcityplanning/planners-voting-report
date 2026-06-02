import { NPU_OPTIONS } from "@/lib/votingReport";

export const NPU_CONTACT_SOURCE = {
  version: "2026",
  sourceName: "2026 NPU INTERNAL Contact List.pdf",
  revisedOn: "2026-04-13",
  expiresOn: "2026-12-31",
} as const;

export type NpuOption = (typeof NPU_OPTIONS)[number];

export type NpuContactDefault = {
  npu: NpuOption;
  chairName: string;
  plannerName: string;
};

export const NPU_CONTACT_DEFAULTS: Record<NpuOption, NpuContactDefault> = {
  A: {
    npu: "A",
    chairName: "W. Brinkley Dickerson, Jr.",
    plannerName: "Redowan Kabir Kaushik",
  },
  B: {
    npu: "B",
    chairName: "Dr. Nancy Bliwise",
    plannerName: "TBD",
  },
  C: {
    npu: "C",
    chairName: "Zack Gober",
    plannerName: "Tatum Jordan-Madden",
  },
  D: {
    npu: "D",
    chairName: 'James "Jim" Martin',
    plannerName: "Nate Hoelzel",
  },
  E: {
    npu: "E",
    chairName: "Nabil Hammam",
    plannerName: "Katherine Hernandez",
  },
  F: {
    npu: "F",
    chairName: "Debbie Skopczynski",
    plannerName: "Doug Young",
  },
  G: {
    npu: "G",
    chairName: "Torrey Sumlin",
    plannerName: "Nathan Carson",
  },
  H: {
    npu: "H",
    chairName: "Khalifa Lee",
    plannerName: "Tia Williams",
  },
  I: {
    npu: "I",
    chairName: "C. Delores Lee-Furlow",
    plannerName: "Susan Coleman",
  },
  J: {
    npu: "J",
    chairName: "Derrick Green",
    plannerName: "Keyetta Holmes",
  },
  K: {
    npu: "K",
    chairName: "Arthur Toal",
    plannerName: "Jack Staples",
  },
  L: {
    npu: "L",
    chairName: "Leonard Watkins",
    plannerName: "Nathan Gallentine",
  },
  M: {
    npu: "M",
    chairName: "Kyle Kessler",
    plannerName: "Haley Swindle",
  },
  N: {
    npu: "N",
    chairName: "Amy Stout",
    plannerName: "Tamaria Letang",
  },
  O: {
    npu: "O",
    chairName: "Joe Schleupner",
    plannerName: "Selena Xayavong",
  },
  P: {
    npu: "P",
    chairName: "Dr. Conchita (Faye) Floyd",
    plannerName: "Kamilah Bakari",
  },
  Q: {
    npu: "Q",
    chairName: "David Getachew-Smith",
    plannerName: "Francis Rozier",
  },
  R: {
    npu: "R",
    chairName: "Rita Harden",
    plannerName: "Brian Widmer",
  },
  S: {
    npu: "S",
    chairName: "Erika Brayboy Collier",
    plannerName: "Carlos M. Garcia",
  },
  T: {
    npu: "T",
    chairName: "Angela Clyde",
    plannerName: "Monique Forte",
  },
  V: {
    npu: "V",
    chairName: "Caitlin Barringer",
    plannerName: "Nirav Gandhi",
  },
  W: {
    npu: "W",
    chairName: "Sky Hassan",
    plannerName: "Steven Aceto",
  },
  X: {
    npu: "X",
    chairName: "Zachary Adriaenssens",
    plannerName: "Anna E. Williams",
  },
  Y: {
    npu: "Y",
    chairName: "Paul McMurray",
    plannerName: "Elizabeth Clappin",
  },
  Z: {
    npu: "Z",
    chairName: "Anne Phillips",
    plannerName: "Thomas Otoo",
  },
} as const;

export function isNpuOption(value: string): value is NpuOption {
  return NPU_OPTIONS.some((npu) => npu === value);
}

export function getNpuContactDefault(npu: string): NpuContactDefault | null {
  if (!isNpuOption(npu)) {
    return null;
  }

  return NPU_CONTACT_DEFAULTS[npu];
}
