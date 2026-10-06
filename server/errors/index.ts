import "server-only";

import type { OrderProblemItem } from "@/shared/api-contract";

/**
 * Коды, которые безопасно отдавать клиенту вместе с `message`/`details`.
 * Единый источник для HTTP (`ApiErrorCode`) и action-маппера.
 * `ORDER_ITEMS_UNAVAILABLE` — только через `OrderItemsUnavailableError` (с problems);
 * голый `DomainError` с этим кодом classify считает internal.
 * `INTERNAL_ERROR` и неизвестные коды — только fallback, без утечки текста.
 */
export const CLIENT_FACING_DOMAIN_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "CONFLICT",
  "ORDER_ITEMS_UNAVAILABLE",
] as const;

export type ClientFacingDomainCode = (typeof CLIENT_FACING_DOMAIN_CODES)[number];

const CLIENT_FACING_DOMAIN_CODE_SET = new Set<string>(CLIENT_FACING_DOMAIN_CODES);

export function isClientFacingDomainCode(
  code: string,
): code is ClientFacingDomainCode {
  return CLIENT_FACING_DOMAIN_CODE_SET.has(code);
}

/** Базовая доменная ошибка: HTTP-статусы знает только transport-слой. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class AuthError extends DomainError {
  declare readonly code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CONFLICT";

  constructor(
    code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CONFLICT",
    message: string,
  ) {
    super(code, message);
    this.name = "AuthError";
  }
}

export class OrderError extends DomainError {
  declare readonly code:
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "NOT_FOUND"
    | "CONFLICT";

  constructor(
    code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT",
    message: string,
  ) {
    super(code, message);
    this.name = "OrderError";
  }
}

/**
 * Атомарный отказ: перечень всех проблемных позиций, заказ не создаётся.
 * Код всегда `ORDER_ITEMS_UNAVAILABLE` (не CONFLICT) — только через этот класс,
 * чтобы в ответе были `problems`, а не «голый» OrderError.
 */
export class OrderItemsUnavailableError extends DomainError {
  declare readonly code: "ORDER_ITEMS_UNAVAILABLE";

  constructor(
    public problems: OrderProblemItem[],
    message = "Некоторые товары недоступны",
  ) {
    super("ORDER_ITEMS_UNAVAILABLE", message);
    this.name = "OrderItemsUnavailableError";
  }
}
