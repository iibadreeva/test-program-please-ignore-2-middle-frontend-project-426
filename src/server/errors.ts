import type { OrderProblemItem } from "@/shared/api-contract";

export class AuthError extends Error {
  constructor(
    public code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class OrderError extends Error {
  constructor(
    public code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

/** Атомарный отказ: перечень всех проблемных позиций, заказ не создаётся. */
export class OrderItemsUnavailableError extends OrderError {
  constructor(
    public problems: OrderProblemItem[],
    message = "Некоторые товары недоступны",
  ) {
    super("CONFLICT", message);
    this.name = "OrderItemsUnavailableError";
  }
}
