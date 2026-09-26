import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
const captureException = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException,
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    queryRaw.mockReset();
    captureException.mockClear();
  });

  it("returns 200 when database responds", async () => {
    queryRaw.mockResolvedValue([{ ok: 1 }]);
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok" });
    expect(queryRaw).toHaveBeenCalled();
  });

  it("returns 503 when database is unreachable", async () => {
    queryRaw.mockRejectedValue(new Error("connection refused"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({
      error: { code: "INTERNAL_ERROR" },
    });
    // Health-probe не должен засыпать Sentry при даунтайме БД.
    expect(captureException).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
