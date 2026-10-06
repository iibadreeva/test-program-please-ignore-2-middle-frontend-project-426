import { describe, expect, it, vi } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { log } from "@server/observability/log";
import {
  prismaTransactionKind,
  queryWithClosedReadRetry,
  resolvePrismaClient,
} from "@server/db-retry";

function closedConnection(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Server has closed the connection.", {
    code: "P1017",
    clientVersion: "test",
  });
}

describe("queryWithClosedReadRetry", () => {
  it("повторяет чтение один раз при закрытом соединении", async () => {
    const query = vi
      .fn()
      .mockRejectedValueOnce(closedConnection())
      .mockResolvedValueOnce([{ id: "p1" }]);

    const result = await queryWithClosedReadRetry("findMany", { where: {} }, query);

    expect(result).toEqual([{ id: "p1" }]);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("не повторяет запись при закрытом соединении", async () => {
    const query = vi.fn().mockRejectedValue(closedConnection());

    await expect(queryWithClosedReadRetry("update", { data: {} }, query)).rejects.toMatchObject({
      code: "P1017",
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("повторяет чтение, если движок сообщил kind: Closed", async () => {
    const query = vi
      .fn()
      .mockRejectedValueOnce(
        new Prisma.PrismaClientUnknownRequestError(
          "connector closed the connection, kind: Closed",
          {
            clientVersion: "test",
          },
        ),
      )
      .mockResolvedValueOnce([]);

    await queryWithClosedReadRetry("count", {}, query);

    expect(query).toHaveBeenCalledTimes(2);
  });

  it.each(["aggregate", "groupBy"])(
    "повторяет чтение %s при закрытом соединении",
    async (operation) => {
      const query = vi.fn().mockRejectedValueOnce(closedConnection()).mockResolvedValueOnce([]);

      await queryWithClosedReadRetry(operation, {}, query);

      expect(query).toHaveBeenCalledTimes(2);
    },
  );

  it.each(["itx", "batch"] as const)("не повторяет чтение внутри транзакции %s", async (kind) => {
    const query = vi.fn().mockRejectedValue(closedConnection());

    await expect(
      queryWithClosedReadRetry("findMany", { where: {} }, query, kind),
    ).rejects.toMatchObject({ code: "P1017" });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("не повторяет чтение, если контракт транзакции Prisma не распознан", async () => {
    const query = vi.fn().mockRejectedValue(closedConnection());
    const warn = vi.spyOn(log, "warn").mockImplementation(() => {});

    await expect(
      queryWithClosedReadRetry("findMany", {}, query, prismaTransactionKind({})),
    ).rejects.toMatchObject({ code: "P1017" });

    expect(query).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "db.retry.unknown_transaction_scope",
      expect.objectContaining({ detail: "missing_internal_params" }),
    );
    warn.mockRestore();
  });

  it("не повторяет чтение при другой ошибке", async () => {
    const query = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(queryWithClosedReadRetry("findMany", {}, query)).rejects.toMatchObject({
      code: "P2002",
    });
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe("prismaTransactionKind", () => {
  it("читает kind интерактивной и batch-транзакции из параметров расширения", () => {
    expect(
      prismaTransactionKind({
        __internalParams: { transaction: { kind: "itx" } },
      }),
    ).toBe("itx");
    expect(
      prismaTransactionKind({
        __internalParams: { transaction: { kind: "batch" } },
      }),
    ).toBe("batch");
  });

  it("вне транзакции поле transaction есть, но пустое — чтение можно повторять", () => {
    expect(prismaTransactionKind({ __internalParams: { transaction: undefined } })).toBe("none");
  });

  it("незнакомый kind и пропавшее поле transaction не считаются «вне транзакции»", () => {
    const warn = vi.spyOn(log, "warn").mockImplementation(() => {});
    expect(
      prismaTransactionKind({
        __internalParams: { transaction: { kind: "interactive" } },
      }),
    ).toBe("unknown");
    expect(prismaTransactionKind({ __internalParams: { transaction: {} } })).toBe("unknown");
    expect(prismaTransactionKind({ __internalParams: {} })).toBe("unknown");
    expect(prismaTransactionKind({})).toBe("unknown");
    warn.mockRestore();
  });

  it("живой клиент вне транзакции отдаёт scope none и не ходит в движок", async () => {
    const client = new PrismaClient({
      datasources: { db: { url: "postgresql://u:p@127.0.0.1:1/none" } },
    });
    let scope: ReturnType<typeof prismaTransactionKind> | undefined;
    const extended = client.$extends({
      query: {
        $allOperations(params) {
          scope = prismaTransactionKind(params);
          throw new Error("stop-before-engine");
        },
      },
    });

    await expect(extended.product.findMany()).rejects.toThrow("stop-before-engine");
    expect(scope).toBe("none");
    await client.$disconnect();
  });
});

describe("resolvePrismaClient", () => {
  it("не создаёт новый клиент, если слот globalThis.prisma уже занят", () => {
    const existing = { id: "old" };
    const slot = { prisma: existing };
    const create = vi.fn(() => ({ id: "new" }));

    const client = resolvePrismaClient(slot, create, true);

    expect(client).toBe(existing);
    expect(create).not.toHaveBeenCalled();
    expect(slot.prisma).toBe(existing);
  });

  it("создаёт клиент один раз и сохраняет его в globalThis.prisma вне production", () => {
    const slot: { prisma?: { id: string } } = {};
    const created = { id: "new" };
    const create = vi.fn(() => created);

    expect(resolvePrismaClient(slot, create, true)).toBe(created);
    expect(resolvePrismaClient(slot, create, true)).toBe(created);
    expect(create).toHaveBeenCalledTimes(1);
    expect(slot.prisma).toBe(created);
  });

  it("в production не записывает клиент в global", () => {
    const slot: { prisma?: { id: string } } = {};
    const create = vi.fn(() => ({ id: "new" }));

    const client = resolvePrismaClient(slot, create, false);

    expect(client).toEqual({ id: "new" });
    expect(create).toHaveBeenCalledTimes(1);
    expect(slot.prisma).toBeUndefined();
  });
});
