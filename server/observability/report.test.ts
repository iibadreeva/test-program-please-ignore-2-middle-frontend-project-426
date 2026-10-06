import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const captureException = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  captureException,
}));

describe("reportUnexpectedError", () => {
  beforeEach(() => {
    // Сбрасываем модульный дедуп между тестами.
    vi.resetModules();
    captureException.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("логирует и шлёт обычную ошибку в Sentry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportUnexpectedError } = await import("@server/observability/report");
    const boom = new Error("boom");
    reportUnexpectedError(boom);
    expect(spy).toHaveBeenCalledWith(boom);
    expect(captureException).toHaveBeenCalledWith(boom);
  });

  it("при serviceUnavailableFallback не шлёт в Sentry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportUnexpectedError } = await import("@server/observability/report");
    const boom = new Error("boom");
    reportUnexpectedError(boom, { serviceUnavailableFallback: true });
    expect(spy).toHaveBeenCalledWith(boom);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("чистый даунтайм Prisma (P1001) логирует, но не шлёт в Sentry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportUnexpectedError } = await import("@server/observability/report");
    const prismaError = new Prisma.PrismaClientKnownRequestError("Can't reach database", {
      code: "P1001",
      clientVersion: "test",
    });
    reportUnexpectedError(prismaError);
    expect(spy).toHaveBeenCalledWith(prismaError);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("P2024 (timeout пула) шлёт в Sentry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportUnexpectedError } = await import("@server/observability/report");
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Timed out fetching a new connection",
      { code: "P2024", clientVersion: "test" },
    );
    reportUnexpectedError(prismaError);
    expect(captureException).toHaveBeenCalledWith(prismaError);
  });

  it("дедуплицирует одинаковый даунтайм БД в коротком окне (sidebar + results)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportUnexpectedError } = await import("@server/observability/report");
    const first = new Prisma.PrismaClientKnownRequestError("Can't reach database", {
      code: "P1001",
      clientVersion: "test",
    });
    const second = new Prisma.PrismaClientKnownRequestError("Can't reach database", {
      code: "P1001",
      clientVersion: "test",
    });

    reportUnexpectedError(first);
    reportUnexpectedError(second);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(first);
  });

  it("не дедуплицирует обычные Error с одинаковым текстом (разные запросы)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportUnexpectedError } = await import("@server/observability/report");
    const first = new Error("boom");
    const second = new Error("boom");

    reportUnexpectedError(first);
    reportUnexpectedError(second);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenNthCalledWith(1, first);
    expect(captureException).toHaveBeenNthCalledWith(2, second);
  });

  it("после окна дедупа снова логирует ту же ошибку", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportUnexpectedError, REPORT_DEDUPE_WINDOW_MS } = await import(
      "@server/observability/report"
    );
    const err = new Prisma.PrismaClientKnownRequestError("Can't reach database", {
      code: "P1001",
      clientVersion: "test",
    });

    reportUnexpectedError(err);
    vi.advanceTimersByTime(REPORT_DEDUPE_WINDOW_MS);
    reportUnexpectedError(err);

    expect(spy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("isDatabaseUnavailableError", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("распознаёт P1001 и InitializationError", async () => {
    const { isDatabaseUnavailableError } = await import("@server/observability/report");
    expect(
      isDatabaseUnavailableError(
        new Prisma.PrismaClientKnownRequestError("down", {
          code: "P1001",
          clientVersion: "test",
        }),
      ),
    ).toBe(true);
    expect(
      isDatabaseUnavailableError(
        new Prisma.PrismaClientInitializationError("init", "test"),
      ),
    ).toBe(true);
    expect(isDatabaseUnavailableError(new Error("other"))).toBe(false);
  });
});
