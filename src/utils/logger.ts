// Minimal logger abstraction. Swap implementation later (e.g., Sentry, Logtail, etc.).
// Keep this very small to avoid client/server boundary leakage.

type Level = "debug" | "info" | "warn" | "error";

interface LogMeta {
  scope?: string;
  [key: string]: unknown;
}

function log(level: Level, message: string, meta?: LogMeta, error?: unknown) {
  // eslint-disable-next-line no-console
  console[level](`[${level}] ${message}${meta?.scope ? ` (${meta.scope})` : ""}`, {
    ...meta,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  });
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => log("debug", message, meta),
  info: (message: string, meta?: LogMeta) => log("info", message, meta),
  warn: (message: string, meta?: LogMeta, error?: unknown) => log("warn", message, meta, error),
  error: (message: string, meta?: LogMeta, error?: unknown) => log("error", message, meta, error),
};
