import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";
import {
  AuthError,
  DomainError,
  OrderError,
  OrderItemsUnavailableError,
} from "@server/errors";
import { mapDomainErrorToActionResult } from "@server/errors/map-to-action";

const captureException = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  captureException,
}));

vi.mock("@server/observability/log", () => ({
  logAuthRejection: vi.fn(),
}));

import { logAuthRejection } from "@server/observability/log";

describe("mapDomainErrorToActionResult", () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("мапит AuthError и логирует отказ", () => {
    const error = new AuthError("CONFLICT", "Email занят");
    const result = mapDomainErrorToActionResult(error, "fallback");
    expect(result).toEqual({ ok: false, message: "Email занят" });
    expect(logAuthRejection).toHaveBeenCalledWith(error);
  });

  it("мапит OrderItemsUnavailableError с problems", () => {
    const problems = [
      { productId: "p1", reason: "unavailable" as const, requested: 2, available: 0 },
    ];
    const error = new OrderItemsUnavailableError(problems);
    expect(error.code).toBe("ORDER_ITEMS_UNAVAILABLE");
    expect(error.code).not.toBe("CONFLICT");
    expect(error).toBeInstanceOf(DomainError);
    expect(error).not.toBeInstanceOf(OrderError);
    const result = mapDomainErrorToActionResult(error, "fallback");
    expect(result).toEqual({
      ok: false,
      message: "Некоторые товары недоступны",
      problems,
    });
  });

  it("мапит OrderError", () => {
    const result = mapDomainErrorToActionResult(
      new OrderError("NOT_FOUND", "Нет заказа"),
      "fallback",
    );
    expect(result).toEqual({ ok: false, message: "Нет заказа" });
  });

  it("мапит ZodError в fieldErrors", () => {
    const parsed = z.object({ email: z.string().email() }).safeParse({ email: "x" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const result = mapDomainErrorToActionResult(parsed.error, "fallback");
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Проверьте поля формы");
    expect(result.fieldErrors).toBeDefined();
  });

  it("неизвестную ошибку отдаёт fallback и шлёт в Sentry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("boom");
    const result = mapDomainErrorToActionResult(boom, "Что-то пошло не так");
    expect(result).toEqual({ ok: false, message: "Что-то пошло не так" });
    expect(captureException).toHaveBeenCalledWith(boom);
  });

  it("мапит базовый DomainError с client-facing code по message", () => {
    const result = mapDomainErrorToActionResult(
      new DomainError("CONFLICT", "Доменный конфликт"),
      "fallback",
    );
    expect(result).toEqual({ ok: false, message: "Доменный конфликт" });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("DomainError VALIDATION_ERROR прокидывает fieldErrors из details", () => {
    const fieldErrors = { email: ["Некорректный email"] };
    const result = mapDomainErrorToActionResult(
      new DomainError("VALIDATION_ERROR", "Проверьте поля формы", { fieldErrors }),
      "fallback",
    );
    expect(result).toEqual({
      ok: false,
      message: "Проверьте поля формы",
      fieldErrors,
    });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("DomainError VALIDATION_ERROR без fieldErrors в details — только message", () => {
    const result = mapDomainErrorToActionResult(
      new DomainError("VALIDATION_ERROR", "Проверьте поля", { other: true }),
      "fallback",
    );
    expect(result).toEqual({ ok: false, message: "Проверьте поля" });
  });

  it("DomainError CONFLICT не прокидывает details в fieldErrors", () => {
    const result = mapDomainErrorToActionResult(
      new DomainError("CONFLICT", "Конфликт", { fieldErrors: { x: ["y"] } }),
      "fallback",
    );
    expect(result).toEqual({ ok: false, message: "Конфликт" });
  });

  it("неизвестный DomainError.code отдаёт fallback и шлёт в Sentry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new DomainError("WEIRD_CODE", "Странная ошибка");
    const result = mapDomainErrorToActionResult(error, "Что-то пошло не так");
    expect(result).toEqual({ ok: false, message: "Что-то пошло не так" });
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("голый DomainError ORDER_ITEMS_UNAVAILABLE — fallback без problems, в Sentry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new DomainError("ORDER_ITEMS_UNAVAILABLE", "без problems");
    const result = mapDomainErrorToActionResult(error, "Что-то пошло не так");
    expect(result).toEqual({ ok: false, message: "Что-то пошло не так" });
    expect(result).not.toHaveProperty("problems");
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("DomainError VALIDATION_ERROR с битым fieldErrors — только message", () => {
    const result = mapDomainErrorToActionResult(
      new DomainError("VALIDATION_ERROR", "Проверьте поля", {
        fieldErrors: { email: "не массив" },
      }),
      "fallback",
    );
    expect(result).toEqual({ ok: false, message: "Проверьте поля" });
  });


  it("DomainError INTERNAL_ERROR отдаёт fallback и шлёт в Sentry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new DomainError("INTERNAL_ERROR", "секрет");
    const result = mapDomainErrorToActionResult(error, "Что-то пошло не так");
    expect(result).toEqual({ ok: false, message: "Что-то пошло не так" });
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("DomainError является базой для AuthError", () => {
    const error = new AuthError("UNAUTHORIZED", "Нужен вход");
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
  });

  it("не использует ZodError как DomainError", () => {
    expect(new ZodError([])).not.toBeInstanceOf(DomainError);
  });
});
