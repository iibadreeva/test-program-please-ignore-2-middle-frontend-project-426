import "server-only";

import * as Sentry from "@sentry/nextjs";
import type { AuthError } from "@server/errors";

type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, string | number | boolean | null | undefined>;

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const payload = { event, ...fields };
  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.info(payload);
  }

  Sentry.addBreadcrumb({
    category: "app",
    message: event,
    level: level === "error" ? "error" : level === "warn" ? "warning" : "info",
    data: fields,
  });
}

export const log = {
  info(event: string, fields?: LogFields) {
    emit("info", event, fields);
  },
  warn(event: string, fields?: LogFields) {
    emit("warn", event, fields);
  },
  error(event: string, fields?: LogFields) {
    emit("error", event, fields);
  },
};

/** Отказ auth → раздельные события для API и server actions. */
export function logAuthRejection(error: AuthError): void {
  const event =
    error.code === "CONFLICT"
      ? "auth.conflict"
      : error.code === "UNAUTHORIZED"
        ? "auth.unauthorized"
        : "auth.validation";
  log.info(event, { code: error.code });
}
