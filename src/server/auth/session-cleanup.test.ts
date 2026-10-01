import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SESSION_CLEANUP_BATCH_SIZE,
  cleanupAllExpiredSessions,
  maybeCleanupExpiredSessions,
  scheduleOpportunisticSessionCleanup,
} from "@/server/auth/session-cleanup";

const findMany = vi.fn();
const deleteMany = vi.fn();

vi.mock("@/server/db", () => ({
  prisma: {
    session: {
      findMany: (...args: unknown[]) => findMany(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
  },
}));

describe("maybeCleanupExpiredSessions", () => {
  beforeEach(() => {
    findMany.mockReset();
    deleteMany.mockReset();
  });

  it("пропускает cleanup, если random выше порога", async () => {
    const count = await maybeCleanupExpiredSessions(() => 0.99);
    expect(count).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("удаляет батч просроченных сессий при срабатывании", async () => {
    findMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
    deleteMany.mockResolvedValue({ count: 2 });

    const count = await maybeCleanupExpiredSessions(() => 0);
    expect(count).toBe(2);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: SESSION_CLEANUP_BATCH_SIZE,
        select: { id: true },
      }),
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["s1", "s2"] } },
    });
  });

  it("не вызывает deleteMany, если просроченных нет", async () => {
    findMany.mockResolvedValue([]);
    const count = await maybeCleanupExpiredSessions(() => 0);
    expect(count).toBe(0);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("при ошибке БД не пробрасывает исключение (логин не должен падать)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    findMany.mockRejectedValue(new Error("db down"));
    await expect(maybeCleanupExpiredSessions(() => 0)).resolves.toBe(0);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("scheduleOpportunisticSessionCleanup не блокирует вызывающего", () => {
    // Батч намеренно не завершается — вызывающий всё равно должен вернуться сразу.
    findMany.mockReturnValue(new Promise(() => {}));

    expect(scheduleOpportunisticSessionCleanup(() => 0)).toBeUndefined();
    expect(findMany).toHaveBeenCalled();
  });

  it("cleanupAllExpiredSessions удаляет батчами до пустого результата", async () => {
    findMany
      .mockResolvedValueOnce([{ id: "s1" }, { id: "s2" }])
      .mockResolvedValueOnce([{ id: "s3" }])
      .mockResolvedValueOnce([]);
    deleteMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });

    const total = await cleanupAllExpiredSessions();
    expect(total).toBe(3);
    expect(findMany).toHaveBeenCalledTimes(3);
    expect(deleteMany).toHaveBeenCalledTimes(2);
  });
});
