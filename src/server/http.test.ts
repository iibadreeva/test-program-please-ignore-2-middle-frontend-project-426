import { describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";
import { AuthError, OrderError, OrderItemsUnavailableError } from "@/server/errors";
import { mapErrorToResponse, withApiHandler } from "@/server/http";

describe("mapErrorToResponse", () => {
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
  });

  it("мапит OrderItemsUnavailableError в 409", async () => {
    const res = mapErrorToResponse(
      new OrderItemsUnavailableError([
        { productId: "p1", reason: "unavailable", requested: 2, available: 0 },
      ]),
      "fallback",
    );
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
  });

  it("мапит AuthError UNAUTHORIZED в 401", async () => {
    const res = mapErrorToResponse(new AuthError("UNAUTHORIZED", "Требуется вход"), "fallback");
    expect(res.status).toBe(401);
  });

  it("неизвестную ошибку отдаёт как 503 и логирует", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mapErrorToResponse(new Error("boom"), "База данных недоступна");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("База данных недоступна");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("withApiHandler", () => {
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
