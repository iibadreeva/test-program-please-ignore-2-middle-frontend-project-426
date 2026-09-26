import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  AuthError,
  OrderError,
  OrderItemsUnavailableError,
} from "@/server/errors";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "ORDER_ITEMS_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type MapErrorOptions = {
  /** true для health: неизвестная/БД ошибка → 503, а не 500. */
  serviceUnavailableFallback?: boolean;
};

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiNoContent() {
  return new NextResponse(null, { status: 204 });
}

function statusForAuthError(error: AuthError): number {
  if (error.code === "UNAUTHORIZED") return 401;
  if (error.code === "CONFLICT") return 409;
  return 400;
}

function statusForOrderError(error: OrderError): number {
  if (error.code === "NOT_FOUND") return 404;
  if (error.code === "UNAUTHORIZED") return 401;
  if (error.code === "CONFLICT") return 409;
  return 400;
}

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

function reportUnexpectedError(error: unknown, options: MapErrorOptions): void {
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

/** Единый mapper доменных/валидационных ошибок → HTTP-ответ контракта. */
export function mapErrorToResponse(
  error: unknown,
  fallbackMessage: string,
  options: MapErrorOptions = {},
): Response {
  if (error instanceof ZodError) {
    return apiError(400, "VALIDATION_ERROR", "Некорректные данные", error.flatten());
  }
  if (error instanceof OrderItemsUnavailableError) {
    return apiError(409, "ORDER_ITEMS_UNAVAILABLE", error.message, error.problems);
  }
  if (error instanceof OrderError) {
    return apiError(statusForOrderError(error), error.code, error.message);
  }
  if (error instanceof AuthError) {
    return apiError(statusForAuthError(error), error.code, error.message);
  }

  reportUnexpectedError(error, options);

  if (options.serviceUnavailableFallback || isDatabaseUnavailableError(error)) {
    return apiError(503, "INTERNAL_ERROR", fallbackMessage);
  }

  return apiError(500, "INTERNAL_ERROR", fallbackMessage);
}

/**
 * Обёртка route handler: ловит thrown errors и отдаёт через mapErrorToResponse.
 * Control-flow ошибки Next (redirect / notFound) пробрасывает дальше — иначе
 * они превратятся в INTERNAL_ERROR.
 */
export async function withApiHandler(
  handler: () => Promise<Response>,
  fallbackMessage: string,
  options: MapErrorOptions = {},
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    unstable_rethrow(error);
    return mapErrorToResponse(error, fallbackMessage, options);
  }
}
