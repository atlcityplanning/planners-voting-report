import { addBusinessDays, addDays, isBefore, startOfDay } from "date-fns";
import { z } from "zod";

// Helper to safely check for a File object across environments
const isFile = (val: unknown): val is File => {
  if (typeof window === "undefined") {
    // Basic structural check for server-side if native File is missing
    return val !== null && typeof val === "object" && "arrayBuffer" in val && "name" in val;
  }
  return val instanceof File;
};

export const emailSchema = z
  .email("Invalid email")
  .endsWith("@atlantaga.gov", "Must be a valid City of Atlanta email (@atlantaga.gov)")
  .transform((v) => v.toLowerCase());

export const assetSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  size: z.string().optional(),
  mimeType: z.string().optional(),
  url: z.string().optional(),
  file: z.custom<File>(isFile, { message: "Must be a valid File object" }).optional(),
});

export const discoverySchema = z
  .object({
    projectType: z.enum(["event", "program", "initiative"]),
    eventDate: z.string().optional(),
    audience: z.string().min(1, "Audience is required"),
    publicValue: z.string().min(1, "Public value is required"),
    goals: z.string().min(1, "Goals are required"),
    partners: z.string().min(1, "Partners are required"),
    deliverables: z.string().min(1, "Specific deliverables are required"),
    alignment: z.array(z.string()).min(1, "At least one city priority is required"),
    dcpAlignment: z.array(z.string()).min(1, "At least one DCP priority is required"),
  })
  .superRefine((data, ctx) => {
    if (data.projectType === "event" && !data.eventDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event date is required",
        path: ["eventDate"],
      });
    }
  });

export const OFFICES = [
  "Mayor's Office of Communications",
  "DCP Office of Commissioner",
  "DCP Office of Buildings",
  "DCP Office of Design",
  "DCP Office of Housing & Community Development",
  "DCP Office of Zoning & Development",
  "DCP Neighborhood Planning Units",
] as const;

export const DELIVERABLE_GROUPS = {
  Digital: [
    { id: "social-media-posts", title: "Social media posts", note: "" },
    { id: "digital-displays", title: "Digital displays", note: "" },
    { id: "email-eblast", title: "Email / eBlast", note: "" },
    {
      id: "website-update",
      title: "Website update",
      note: "Please specify if it's a new or existing page, and include the url of the page requested in your description above.",
    },
    // {
    //   id: "photography",
    //   title: "Photography",
    //   note: "Please include the date, start/end shoot times, location, and shots needed in your description above.",
    // },
    {
      id: "videography",
      title: "Videography",
      note: "Please include the date, start/end shoot times, location, and shots needed in your description above.",
    },
    { id: "motion-graphics", title: "Motion graphics", note: "" },
    { id: "press-release", title: "Press release", note: "" },
  ],
  Print: [
    { id: "flyer-one-pager", title: "Flyer / One pager", note: "" },
    { id: "poster", title: "Poster", note: "" },
    { id: "pull-up-banner", title: "Pull-up banner", note: "" },
    { id: "postcard", title: "Postcard", note: "" },
    {
      id: "brochure-booklet-program",
      title: "Brochure / Booklet / Program",
      note: "This deliverable may require an extended conversation or discovery session beyond our standard templates, depending on the assets you provide.",
    },
    { id: "fact-sheet", title: "Fact sheet", note: "" },
  ],
} as const;

export const REQUEST_SCOPES = [
  {
    id: "general",
    title: "General Request",
    description: "Standard design deliverables like flyers, social media graphics, or web pages.",
  },
  {
    id: "discovery",
    title: "Discovery Session",
    description: "Major campaigns, branding, or complex reports requiring strategic planning.",
  },
];

const FLATTENED_DELIVERABLES = [
  ...DELIVERABLE_GROUPS.Digital.map((d) => d.id),
  ...DELIVERABLE_GROUPS.Print.map((d) => d.id),
];

export const OfficeEnum = z.enum(OFFICES);
export const RequestScopeEnum = z.enum(REQUEST_SCOPES.map((r) => r.id));
export const DeliverableEnum = z.enum(FLATTENED_DELIVERABLES);
export const MIN_DAYS = 7;

/**
 * Shared deadline rule helpers (single source of truth)
 */
export function getMinDeadlineDate(scope?: RequestScope, now: Date = new Date()) {
  if (scope === "discovery") {
    return startOfDay(addDays(now, 30));
  }
  return startOfDay(addBusinessDays(now, MIN_DAYS));
}

export function parseYmdToLocalDate(val: string): Date | undefined {
  // Expecting YYYY-MM-DD. Parse as local date.
  const [y, m, d] = val.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export function isDeadlineValid(val: string, scope?: RequestScope, now: Date = new Date()) {
  const date = parseYmdToLocalDate(val);
  if (!date) return false;
  const min = getMinDeadlineDate(scope, now);
  return !isBefore(date, min);
}

const baseSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: emailSchema,
  office: OfficeEnum,
  sponsor: z.object({
    supported: z.literal(true, {
      error: () => ({ message: "Sponsor support is required" }),
    }),
    email: emailSchema,
  }),
  requestTitle: z.string().min(1, "Project title is required"),
  deadline: z.string().min(1, "Deadline is required"),
  additionalNotes: z.string(),
  assets: z.array(assetSchema),
});

export const formSchema = z
  .discriminatedUnion("requestScope", [
    baseSchema.extend({
      requestScope: z.literal("general"),
      requestDescription: z.string().min(15, "Description is required"),
      deliverables: z.array(DeliverableEnum).min(1, "Select at least one deliverable"),
    }),
    baseSchema.extend({
      requestScope: z.literal("discovery"),
      requestDescription: z.string().min(15, "Description is required"),
      discovery: discoverySchema,
    }),
  ])
  .superRefine((data, ctx) => {
    const scope = data.requestScope;
    const deadline = data.deadline;

    if (!isDeadlineValid(deadline, scope)) {
      const message =
        scope === "discovery"
          ? "Discovery sessions require a minimum of 30 calendar days."
          : `Deadline must be at least ${MIN_DAYS} business days from today.`;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["deadline"],
      });
    }
  });

export type Office = z.infer<typeof OfficeEnum>;
export type RequestScope = z.infer<typeof RequestScopeEnum>;
export type Deliverables = z.infer<typeof DeliverableEnum>;
export type Asset = z.infer<typeof assetSchema>;
export type Discovery = z.infer<typeof discoverySchema>;
export type IntakeFormData = z.infer<typeof formSchema>;
