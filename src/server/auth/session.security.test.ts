import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesGet = vi.hoisted(() => vi.fn());
const cookiesSet = vi.hoisted(() => vi.fn());
const sessionFindUnique = vi.hoisted(() => vi.fn());
const sessionDelete = vi.hoisted(() => vi.fn());
const sessionDeleteMany = vi.hoisted(() => vi.fn());
const sessionCreate = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: cookiesGet,
    set: cookiesSet,
  }),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    session: {
      findUnique: sessionFindUnique,
      delete: sessionDelete,
      deleteMany: sessionDeleteMany,
      create: sessionCreate,
    },
  },
}));

vi.mock("@/server/auth/session-cleanup", () => ({
  scheduleOpportunisticSessionCleanup: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

describe("session security", () => {
  beforeEach(() => {
    cookiesGet.mockReset();
    cookiesSet.mockReset();
    sessionFindUnique.mockReset();
    sessionDelete.mockReset();
    sessionDeleteMany.mockReset();
    sessionCreate.mockReset();
    vi.resetModules();
  });

  it("истекшая сессия удаляется и не авторизует", async () => {
    cookiesGet.mockReturnValue({ value: "raw-token" });
    sessionFindUnique.mockResolvedValue({
      id: "sess-1",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() - 60_000),
      user: { id: "u1", email: "u@e.c", name: "U" },
    });
    sessionDelete.mockResolvedValue({});

    const { getCurrentUser } = await import("@/server/auth/session");
    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(sessionDelete).toHaveBeenCalledWith({ where: { id: "sess-1" } });
  });

  it("logout удаляет сессию из БД", async () => {
    cookiesGet.mockReturnValue({ value: "raw-token" });
    sessionDeleteMany.mockResolvedValue({ count: 1 });

    const { destroySession } = await import("@/server/auth/session");
    await destroySession();

    expect(sessionDeleteMany).toHaveBeenCalled();
    expect(cookiesSet).toHaveBeenCalled();
  });
});
