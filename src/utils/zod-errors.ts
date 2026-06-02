type IssueLike = {
  // Zod v4 uses PropertyKey[] (string | number | symbol)
  path: PropertyKey[];
  message: string;
};

type SafeParseErrorLike = {
  issues: IssueLike[];
};

type SafeParseResultLike =
  | { success: true; data: unknown }
  | { success: false; error: SafeParseErrorLike };

type SchemaLike = {
  safeParse: (value: unknown) => SafeParseResultLike;
};

export type TanStackErrors = { fields: Record<string, unknown> };

function toKey(k: PropertyKey): string {
  // Convert symbol safely for object keys
  return typeof k === "symbol" ? (k.description ?? k.toString()) : String(k);
}

/**
 * Produces nested structure:
 * { fields: { sponsor: { email: "..." }, deliverables: "..." } }
 */
export function zodIssuesToTanStackErrors(issues: IssueLike[]): TanStackErrors {
  const errors: TanStackErrors = { fields: {} };

  for (const issue of issues) {
    const path = issue.path;
    let current: any = errors.fields;

    if (path.length === 0) {
      current._form = issue.message;
      continue;
    }

    if (path.length === 1) {
      current[toKey(path[0])] = issue.message;
      continue;
    }

    for (let i = 0; i < path.length - 1; i++) {
      const key = toKey(path[i]);
      if (!current[key]) current[key] = {};
      current = current[key];
    }

    current[toKey(path[path.length - 1])] = issue.message;
  }

  return errors;
}

/**
 * TanStack validator helper. Returns void when valid, otherwise TanStack error object.
 */
export function validateWithZod(schema: SchemaLike, value: unknown): TanStackErrors | void {
  const result = schema.safeParse(value);
  if (result.success) return;
  return zodIssuesToTanStackErrors(result.error.issues);
}
