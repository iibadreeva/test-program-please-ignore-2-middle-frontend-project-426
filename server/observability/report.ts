import "server-only";

import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";

/** Опции репорта: health-probe не шумит в Sentry. */
export type ReportUnexpectedErrorOptions = {
  /** true для health: неизвестная/БД ошибка → без Sentry (алерт через /api/health). */
  serviceUnavailableFallback?: boolean;
};

/** Окно дедупа: sidebar+results каталога не должны дважды шуметь одним даунтаймом. */
export const REPORT_DEDUPE_WINDOW_MS = 2000;

/** Явный даунтайм соединения — 503 без Sentry (алерт через /api/health). */
const PRISMA_CONNECTION_DOWN_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1009",
  "P1010",
  "P1011",
  "P1017",
]);

/**
 * Деградация доступности (например timeout пула): HTTP 503, но в Sentry —
 * может быть утечка соединений, а не только «БД лежит».
 */
const PRISMA_DEGRADED_CODES = new Set(["P2024"]);

let lastDedupeKey: string | undefined;
let lastDedupeAt = 0;

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;
  // Без кода: часто engine/сеть — клиенту 503, в Sentry всё же шлём (см. report).
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      PRISMA_CONNECTION_DOWN_CODES.has(error.code) ||
      PRISMA_DEGRADED_CODES.has(error.code)
    );
  }
  return false;
}

/** Ошибки с 503, которые всё равно репортим: не чистый даунтайм соединения. */
function shouldReportDegradedDatabaseError(error: unknown): boolean {
  // Panic engine — баг/коррупция, не «БД лежит»; алертим через Sentry.
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_DEGRADED_CODES.has(error.code);
  }
  return false;
}

function errorDedupeKey(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `prisma:known:${error.code}`;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "prisma:init";
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return "prisma:panic";
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return "prisma:unknown";
  }
  if (error instanceof Error) {
    return `error:${error.name}:${error.message}`;
  }
  return `unknown:${String(error)}`;
}

/**
 * Дедуп только для outage БД (sidebar + results одной страницы).
 * Обычные Error не схлопываем — иначе разные запросы с одним текстом потеряют Sentry.
 */
function consumeDuplicateDatabaseOutage(error: unknown): boolean {
  if (!isDatabaseUnavailableError(error)) return false;
  const key = errorDedupeKey(error);
  const now = Date.now();
  if (lastDedupeKey === key && now - lastDedupeAt < REPORT_DEDUPE_WINDOW_MS) {
    return true;
  }
  lastDedupeKey = key;
  lastDedupeAt = now;
  return false;
}

/** Лог + Sentry: чистый даунтайм БД не шумит (алерт через /api/health). */
export function reportUnexpectedError(
  error: unknown,
  options: ReportUnexpectedErrorOptions = {},
): void {
  // Один outage БД (catalog sidebar + results) — один лог/Sentry.
  if (consumeDuplicateDatabaseOutage(error)) return;

  console.error(error);
  // Health-probe не шумит в Sentry; чистый даунтайм БД — через /api/health.
  if (options.serviceUnavailableFallback) return;
  if (
    isDatabaseUnavailableError(error) &&
    !shouldReportDegradedDatabaseError(error)
  ) {
    return;
  }
  Sentry.captureException(error);
}
