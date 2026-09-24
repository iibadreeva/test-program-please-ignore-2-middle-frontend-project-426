import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
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

/** Единый mapper доменных/валидационных ошибок → HTTP-ответ контракта. */
export function mapErrorToResponse(error: unknown, fallbackMessage: string): Response {
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
  console.error(error);
  return apiError(503, "INTERNAL_ERROR", fallbackMessage);
}

/**
 * Обёртка route handler: ловит thrown errors и отдаёт через mapErrorToResponse.
 * Control-flow ошибки Next (redirect / notFound) пробрасывает дальше — иначе
 * они превратились бы в 503 INTERNAL_ERROR.
 */
export async function withApiHandler(
  handler: () => Promise<Response>,
  fallbackMessage: string,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    unstable_rethrow(error);
    return mapErrorToResponse(error, fallbackMessage);
  }
}
