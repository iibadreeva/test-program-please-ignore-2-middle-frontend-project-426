import "server-only";

import { ZodError } from "zod";
import {
  AuthError,
  type ClientFacingDomainCode,
  DomainError,
  isClientFacingDomainCode,
  OrderError,
  OrderItemsUnavailableError,
} from "@server/errors";

/**
 * Единая классификация доменных/валидационных ошибок для HTTP и server actions.
 * Порядок instanceof важен: подклассы раньше базовых DomainError/OrderError.
 */
export type ClassifiedDomainError =
  | { kind: "auth"; error: AuthError }
  | { kind: "order_items_unavailable"; error: OrderItemsUnavailableError }
  | { kind: "order"; error: OrderError }
  | {
      kind: "domain_client";
      error: DomainError;
      code: ClientFacingDomainCode;
    }
  | { kind: "domain_internal"; error: DomainError }
  | { kind: "zod"; error: ZodError }
  | { kind: "unknown"; error: unknown };

export function classifyDomainError(error: unknown): ClassifiedDomainError {
  if (error instanceof OrderItemsUnavailableError) {
    return { kind: "order_items_unavailable", error };
  }
  if (error instanceof OrderError) {
    return { kind: "order", error };
  }
  if (error instanceof AuthError) {
    return { kind: "auth", error };
  }
  if (error instanceof DomainError) {
    // ORDER_ITEMS_UNAVAILABLE только через subclass (с problems) — иначе 409 без details.
    if (error.code === "ORDER_ITEMS_UNAVAILABLE") {
      return { kind: "domain_internal", error };
    }
    if (isClientFacingDomainCode(error.code)) {
      return { kind: "domain_client", error, code: error.code };
    }
    return { kind: "domain_internal", error };
  }
  if (error instanceof ZodError) {
    return { kind: "zod", error };
  }
  return { kind: "unknown", error };
}

function isFieldErrorMessages(value: unknown): value is string[] | undefined {
  if (value === undefined) return true;
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** fieldErrors из details DomainError — как у Zod flatten, без прочих полей. */
export function fieldErrorsFromDetails(
  details: unknown,
): Record<string, string[] | undefined> | undefined {
  if (
    typeof details !== "object" ||
    details === null ||
    !("fieldErrors" in details)
  ) {
    return undefined;
  }
  const fieldErrors = (details as { fieldErrors: unknown }).fieldErrors;
  // Не массив и не null-прототип: только plain object с ключами полей.
  if (
    typeof fieldErrors !== "object" ||
    fieldErrors === null ||
    Array.isArray(fieldErrors)
  ) {
    return undefined;
  }

  const result: Record<string, string[] | undefined> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (!isFieldErrorMessages(value)) return undefined;
    result[key] = value;
  }
  return result;
}
