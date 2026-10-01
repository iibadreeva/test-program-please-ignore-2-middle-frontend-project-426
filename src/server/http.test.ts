import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ZodError, z } from "zod";
import { Prisma } from "@prisma/client";
import {
  AuthError,
  DomainError,
  OrderError,
  OrderItemsUnavailableError,
} from "@/server/errors";
import { mapErrorToResponse, withApiHandler } from "@/server/http";

const captureException = vi.hoisted(() => vi.fn());
const addBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  captureException,
  addBreadcrumb,
}));

describe("mapErrorToResponse", () => {
  beforeEach(() => {
    captureException.mockClear();
    addBreadcrumb.mockClear();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("мапит ZodError в 400 VALIDATION_ERROR", async () => {
    const parsed = z.object({ email: z.string().email() }).safeParse({ email: "x" });
    expect(parsed.success).toBe(false);
    const res = mapErrorToResponse(
      parsed.success ? new Error("unreachable") : parsed.error,
      "fallback",
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("мапит OrderItemsUnavailableError в 409", async () => {
    const error = new OrderItemsUnavailableError([
      { productId: "p1", reason: "unavailable", requested: 2, available: 0 },
    ]);
    expect(error.code).toBe("ORDER_ITEMS_UNAVAILABLE");
    const res = mapErrorToResponse(error, "fallback");
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("ORDER_ITEMS_UNAVAILABLE");
    expect(body.error.details).toEqual([
      { productId: "p1", reason: "unavailable", requested: 2, available: 0 },
    ]);
  });

  it("мапит OrderError NOT_FOUND в 404", async () => {
    const res = mapErrorToResponse(new OrderError("NOT_FOUND", "Нет заказа"), "fallback");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("мапит AuthError CONFLICT в 409", async () => {
    const res = mapErrorToResponse(new AuthError("CONFLICT", "Email занят"), "fallback");
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: "auth.conflict" }),
    );
  });

  it("мапит AuthError UNAUTHORIZED в 401", async () => {
    const res = mapErrorToResponse(new AuthError("UNAUTHORIZED", "Требуется вход"), "fallback");
    expect(res.status).toBe(401);
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: "auth.unauthorized" }),
    );
    expect(captureException).not.toHaveBeenCalled();
  });

  it("мапит базовый DomainError CONFLICT в 409 без Sentry", async () => {
    const res = mapErrorToResponse(
      new DomainError("CONFLICT", "Доменный конфликт"),
      "fallback",
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.message).toBe("Доменный конфликт");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("DomainError CONFLICT не прокидывает произвольные details", async () => {
    const res = mapErrorToResponse(
      new DomainError("CONFLICT", "Конфликт", { secret: "db-password", stack: true }),
      "fallback",
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.message).toBe("Конфликт");
    expect(body.error.details).toBeUndefined();
  });

  it("DomainError VALIDATION_ERROR может отдать details", async () => {
    const details = { fieldErrors: { email: ["invalid"] } };
    const res = mapErrorToResponse(
      new DomainError("VALIDATION_ERROR", "Проверьте поля", details),
      "fallback",
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual(details);
  });

  it("DomainError VALIDATION_ERROR с битым fieldErrors — без details", async () => {
    const res = mapErrorToResponse(
      new DomainError("VALIDATION_ERROR", "Проверьте поля", {
        fieldErrors: { email: "не массив" },
      }),
      "fallback",
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Проверьте поля");
    expect(body.error.details).toBeUndefined();
  });

  it("неизвестный DomainError.code отдаёт 500 с fallback, без утечки message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mapErrorToResponse(
      new DomainError("WEIRD_CODE", "Странная ошибка"),
      "fallback",
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("fallback");
    expect(body.error.details).toBeUndefined();
    expect(captureException).toHaveBeenCalled();
  });

  it("голый DomainError ORDER_ITEMS_UNAVAILABLE → 500, без 409/problems", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mapErrorToResponse(
      new DomainError("ORDER_ITEMS_UNAVAILABLE", "без problems"),
      "fallback",
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("fallback");
    expect(body.error.details).toBeUndefined();
    expect(captureException).toHaveBeenCalled();
  });

  it("DomainError INTERNAL_ERROR отдаёт fallback, не сырой message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mapErrorToResponse(
      new DomainError("INTERNAL_ERROR", "db password leaked", { secret: true }),
      "Внутренняя ошибка",
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Внутренняя ошибка");
    expect(body.error.details).toBeUndefined();
    expect(captureException).toHaveBeenCalled();
  });

  it("неизвестную ошибку отдаёт как 500, логирует и шлёт в Sentry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("boom");
    const res = mapErrorToResponse(boom, "Внутренняя ошибка");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Внутренняя ошибка");
    expect(spy).toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(boom);
  });

  it("при serviceUnavailableFallback отдаёт 503, логирует, но не шлёт в Sentry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("boom");
    const res = mapErrorToResponse(boom, "База данных недоступна", {
      serviceUnavailableFallback: true,
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("База данных недоступна");
    expect(spy).toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("ошибку соединения Prisma отдаёт как 503, логирует, но не шлёт в Sentry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const prismaError = new Prisma.PrismaClientKnownRequestError("Can't reach database", {
      code: "P1001",
      clientVersion: "test",
    });
    const res = mapErrorToResponse(prismaError, "База данных недоступна");
    expect(res.status).toBe(503);
    expect(spy).toHaveBeenCalled();
    // Даунтайм БД алертим через /api/health, а не через flood в Sentry.
    expect(captureException).not.toHaveBeenCalled();
  });

  it("timeout пула Prisma (P2024) отдаёт как 503 и шлёт в Sentry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const prismaError = new Prisma.PrismaClientKnownRequestError("Timed out fetching a new connection", {
      code: "P2024",
      clientVersion: "test",
    });
    const res = mapErrorToResponse(prismaError, "База данных недоступна");
    expect(res.status).toBe(503);
    expect(spy).toHaveBeenCalled();
    // P2024 может быть утечкой пула — в Sentry, чтобы не пропустить регрессию.
    expect(captureException).toHaveBeenCalledWith(prismaError);
  });

  it("PrismaClientUnknownRequestError отдаёт как 503 и шлёт в Sentry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const prismaError = new Prisma.PrismaClientUnknownRequestError("Response from the Engine was empty", {
      clientVersion: "test",
    });
    const res = mapErrorToResponse(prismaError, "База данных недоступна");
    expect(res.status).toBe(503);
    expect(spy).toHaveBeenCalled();
    // Unknown шире «нет соединения» — в Sentry, чтобы не прятать сбои engine.
    expect(captureException).toHaveBeenCalledWith(prismaError);
  });

  it("PrismaClientRustPanicError отдаёт как 503 и шлёт в Sentry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const prismaError = new Prisma.PrismaClientRustPanicError("PANIC in query engine", "test");
    const res = mapErrorToResponse(prismaError, "База данных недоступна");
    expect(res.status).toBe(503);
    expect(spy).toHaveBeenCalled();
    // Panic engine — баг/коррупция, не чистый аутаж; в Sentry, как P2024.
    expect(captureException).toHaveBeenCalledWith(prismaError);
  });
});

describe("withApiHandler", () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it("возвращает ответ handler без изменений", async () => {
    const res = await withApiHandler(async () => new Response("ok", { status: 200 }), "fail");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("ловит thrown error через mapper", async () => {
    const res = await withApiHandler(async () => {
      throw new AuthError("UNAUTHORIZED", "Требуется вход");
    }, "fail");
    expect(res.status).toBe(401);
  });

  it("мапит thrown ZodError в 400 Response", async () => {
    const res = await withApiHandler(async () => {
      throw new ZodError([]);
    }, "fail");
    expect(res.status).toBe(400);
  });

  it("пробрасывает control-flow ошибки Next (redirect / notFound)", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;push;/account;307;",
    });
    await expect(
      withApiHandler(async () => {
        throw redirectError;
      }, "fail"),
    ).rejects.toBe(redirectError);

    const notFoundError = Object.assign(new Error("NEXT_NOT_FOUND"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    await expect(
      withApiHandler(async () => {
        throw notFoundError;
      }, "fail"),
    ).rejects.toBe(notFoundError);
  });
});
