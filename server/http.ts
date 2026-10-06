import "server-only";

import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { type ClientFacingDomainCode } from "@server/errors";
import {
  classifyDomainError,
  fieldErrorsFromDetails,
} from "@server/errors/classify";
import { logAuthRejection } from "@server/observability/log";
import {
  isDatabaseUnavailableError,
  reportUnexpectedError,
  type ReportUnexpectedErrorOptions,
} from "@server/observability/report";

export {
  isDatabaseUnavailableError,
  reportUnexpectedError,
} from "@server/observability/report";

/** HTTP-контракт: client-facing коды из errors + INTERNAL_ERROR. */
export type ApiErrorCode = ClientFacingDomainCode | "INTERNAL_ERROR";

const STATUS_BY_API_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ORDER_ITEMS_UNAVAILABLE: 409,
  INTERNAL_ERROR: 500,
};

/** Опции mapError: 503-fallback + политика Sentry из report. */
export type MapErrorOptions = ReportUnexpectedErrorOptions;

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error: { code, message, details } }, { status, headers });
}

export function apiOk<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers });
}

/** Метаданные витрины без остатков (категории/бренды): CDN ok. */
export const PUBLIC_API_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
} as const;

/**
 * Ответы с stock/availability: не класть на shared CDN —
 * иначе revalidateTag не сбросит edge-кэш до TTL.
 */
export const STOCK_API_CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

export function apiNoContent() {
  return new NextResponse(null, { status: 204 });
}

function statusForApiCode(code: ApiErrorCode): number {
  return STATUS_BY_API_CODE[code];
}

/** Единый mapper доменных/валидационных ошибок → HTTP-ответ контракта. */
export function mapErrorToResponse(
  error: unknown,
  fallbackMessage: string,
  options: MapErrorOptions = {},
): Response {
  const classified = classifyDomainError(error);

  switch (classified.kind) {
    case "zod":
      return apiError(
        400,
        "VALIDATION_ERROR",
        "Некорректные данные",
        classified.error.flatten(),
      );
    case "order_items_unavailable":
      return apiError(
        statusForApiCode(classified.error.code),
        classified.error.code,
        classified.error.message,
        classified.error.problems,
      );
    case "order":
      return apiError(
        statusForApiCode(classified.error.code),
        classified.error.code,
        classified.error.message,
      );
    case "auth":
      logAuthRejection(classified.error);
      return apiError(
        statusForApiCode(classified.error.code),
        classified.error.code,
        classified.error.message,
      );
    case "domain_client": {
      // details наружу только для VALIDATION_ERROR и только после проверки shape.
      let details: { fieldErrors: Record<string, string[] | undefined> } | undefined;
      if (classified.code === "VALIDATION_ERROR") {
        const fieldErrors = fieldErrorsFromDetails(classified.error.details);
        if (fieldErrors) details = { fieldErrors };
      }
      return apiError(
        statusForApiCode(classified.code),
        classified.code,
        classified.error.message,
        details,
      );
    }
    case "domain_internal":
      reportUnexpectedError(classified.error, options);
      return apiError(500, "INTERNAL_ERROR", fallbackMessage);
    case "unknown":
      reportUnexpectedError(classified.error, options);
      if (
        options.serviceUnavailableFallback ||
        isDatabaseUnavailableError(classified.error)
      ) {
        return apiError(503, "INTERNAL_ERROR", fallbackMessage);
      }
      return apiError(500, "INTERNAL_ERROR", fallbackMessage);
  }
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
