import "server-only";

import { PrismaClient } from "@prisma/client";
import { getServerEnv, resolveDatabaseUrl } from "@server/config/env";
import {
  prismaTransactionKind,
  queryWithClosedReadRetry,
  resolvePrismaClient,
} from "@server/db-retry";

function createPrismaClient() {
  const env = getServerEnv();
  const url = resolveDatabaseUrl(env.DATABASE_URL);
  const client = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Переопределяем URL только если задан — на `next build` БД может не быть.
    ...(url ? { datasources: { db: { url } } } : {}),
  });

  // Повтор чтений живёт в расширении. Тип расширенного клиента не совпадает
  // с Prisma.TransactionClient, поэтому снаружи отдаём PrismaClient.
  return client.$extends({
    query: {
      $allOperations(params) {
        return queryWithClosedReadRetry(
          params.operation,
          params.args,
          params.query,
          prismaTransactionKind(params),
        );
      },
    },
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Вне production кладём клиент в global: HMR не должен плодить пулы.
// Мёртвое соединение повторяет queryWithClosedReadRetry, клиент не подменяем.
export const prisma = resolvePrismaClient(
  globalForPrisma,
  createPrismaClient,
  getServerEnv().NODE_ENV !== "production",
);
