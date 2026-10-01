import "server-only";

import { Prisma } from "@prisma/client";
import { log } from "@/server/observability/log";

/** Чтения идемпотентны. Запись (в том числе decrement остатка) повторять нельзя. */
const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** none — вне транзакции; itx/batch — внутри; unknown — контракт Prisma не узнали. */
export type PrismaTransactionScope = "none" | "itx" | "batch" | "unknown";

const reportedUnknownScopes = new Set<string>();

function reportUnknownTransactionScope(detail: string): void {
  if (reportedUnknownScopes.has(detail)) return;
  reportedUnknownScopes.add(detail);
  log.warn("db.retry.unknown_transaction_scope", { detail });
}

function isClosedConnection(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1017";
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return /closed the connection|kind: Closed/i.test(error.message);
  }
  return false;
}

/**
 * Scope из `$allOperations`. Prisma 6 кладёт запрос в `__internalParams`,
 * а транзакцию — в его поле `transaction` (`kind`: `itx` или `batch`).
 * Вне транзакции ключ `transaction` есть и равен undefined.
 * Нет ключа, незнакомый kind или объект без kind — `unknown`: чтение не повторяем,
 * иначе запрос ушёл бы в другой снимок. Предупреждение пишем один раз на причину.
 */
export function prismaTransactionKind(params: object): PrismaTransactionScope {
  if (!("__internalParams" in params)) {
    reportUnknownTransactionScope("missing_internal_params");
    return "unknown";
  }

  const internal = (params as { __internalParams?: unknown }).__internalParams;
  if (internal == null || typeof internal !== "object") {
    reportUnknownTransactionScope("invalid_internal_params");
    return "unknown";
  }

  if (!("transaction" in internal)) {
    reportUnknownTransactionScope("missing_transaction_field");
    return "unknown";
  }

  const transaction = (internal as { transaction?: unknown }).transaction;
  if (transaction == null) return "none";
  if (typeof transaction !== "object") {
    reportUnknownTransactionScope("invalid_transaction");
    return "unknown";
  }

  const kind = (transaction as { kind?: unknown }).kind;
  if (kind === "itx" || kind === "batch") return kind;

  reportUnknownTransactionScope("unrecognized_kind");
  return "unknown";
}

/**
 * Один повтор чтения, если пулер закрыл соединение.
 * Запись не трогаем: повтор внутри транзакции заказа может списать остаток дважды.
 * Чтение внутри itx/batch и при нераспознанном scope не повторяем:
 * соединение транзакции уже мертво, новый запрос ушёл бы в другой снимок.
 * `$disconnect` всего пула отсюда не вызываем — он оборвал бы чужие запросы.
 */
export async function queryWithClosedReadRetry<TArgs, TResult>(
  operation: string,
  args: TArgs,
  query: (args: TArgs) => Promise<TResult>,
  transactionScope: PrismaTransactionScope = "none",
): Promise<TResult> {
  try {
    return await query(args);
  } catch (error) {
    // unknown тоже не повторяем: неясно, живёт ли запрос внутри транзакции заказа.
    if (transactionScope !== "none") throw error;
    if (!READ_OPERATIONS.has(operation) || !isClosedConnection(error)) throw error;
    return query(args);
  }
}

/** Ключ `prisma` — тот же, что у предыдущей копии модуля: HMR подхватывает живой клиент. */
type PrismaSlot<T> = {
  prisma?: T;
};

/**
 * Singleton Prisma. Слот на globalThis.prisma переживает HMR: новый клиент создаём
 * только если слота ещё нет. Закрытое соединение чинит повтор чтения,
 * а не disconnect пула на каждой перезагрузке модуля.
 * В production слот не пишем — экземпляр живёт в кэше модуля.
 */
export function resolvePrismaClient<T>(
  slot: PrismaSlot<T>,
  create: () => T,
  cacheOnGlobal: boolean,
): T {
  const client = slot.prisma ?? create();
  if (cacheOnGlobal) slot.prisma = client;
  return client;
}
