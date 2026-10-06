import "server-only";

import { z } from "zod";

/** Пустая строка → undefined (в Docker часто задают DATABASE_URL=""). */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

/**
 * Серверный env. DATABASE_URL опционален на этапе `next build`
 * (базы ещё нет); в runtime без него Prisma/старт упадут явно.
 * Нестандартный NODE_ENV не валит процесс — трактуем как «не задан».
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NODE_ENV: z.preprocess(emptyToUndefined, z.string().optional()).transform((value) => {
    if (value === "development" || value === "production" || value === "test") {
      return value;
    }
    return undefined;
  }),
  // COOKIE_SECURE — в shared/cookie-secure (edge-совместимо); SENTRY_DSN — в instrumentation.
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}

/** Ключ кэша: при смене stubEnv в тестах снимок перечитывается. */
function envCacheKey(): string {
  return `${process.env.DATABASE_URL ?? ""}\0${process.env.NODE_ENV ?? ""}`;
}

let cachedEnv: ServerEnv | undefined;
let cachedEnvKey: string | undefined;

/**
 * Ленивый снимок env. Повторяющиеся вызовы с тем же process.env
 * не парсят Zod заново; смена переменных (тесты) инвалидирует кэш.
 */
export function getServerEnv(): ServerEnv {
  const key = envCacheKey();
  if (cachedEnv && cachedEnvKey === key) return cachedEnv;
  cachedEnv = readServerEnv();
  cachedEnvKey = key;
  return cachedEnv;
}

/** Есть ли query-параметр `key` (без разбора credentials через URL). */
function hasQueryParam(url: string, key: string): boolean {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) return false;
  const hashStart = url.indexOf("#", queryStart);
  const query = hashStart === -1 ? url.slice(queryStart + 1) : url.slice(queryStart + 1, hashStart);
  return query.split("&").some((part) => {
    if (!part) return false;
    const eq = part.indexOf("=");
    const name = eq === -1 ? part : part.slice(0, eq);
    return decodeURIComponent(name) === key;
  });
}

/**
 * Дописывает query-параметр, не трогая остальную строку
 * (пароли со спецсимволами не перекодируются через `new URL`).
 */
function appendQueryParam(url: string, key: string, value: string): string {
  if (hasQueryParam(url, key)) return url;
  const hashStart = url.indexOf("#");
  const beforeHash = hashStart === -1 ? url : url.slice(0, hashStart);
  const hash = hashStart === -1 ? "" : url.slice(hashStart);
  const sep = beforeHash.includes("?") ? "&" : "?";
  return `${beforeHash}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}${hash}`;
}

/**
 * Хост из connection string без `new URL`: пароль со спецсимволами не перекодируем.
 * Без userinfo хост идёт сразу после схемы.
 */
function databaseHost(url: string): string {
  const schemeIdx = url.indexOf("://");
  const rest = schemeIdx === -1 ? url : url.slice(schemeIdx + 3);
  const at = rest.lastIndexOf("@");
  const authorityAndPath = at === -1 ? rest : rest.slice(at + 1);
  const authority = authorityAndPath.split(/[/?#]/, 1)[0] ?? "";
  if (authority.startsWith("[")) {
    const end = authority.indexOf("]");
    return (end === -1 ? authority : authority.slice(1, end)).toLowerCase();
  }
  const colon = authority.lastIndexOf(":");
  const host = colon === -1 ? authority : authority.slice(0, colon);
  return host.toLowerCase();
}

/** pooled.db.prisma.io — PgBouncer: без этого флага сервер рвёт prepared statements. */
function isPooledDatabaseHost(url: string): boolean {
  return databaseHost(url) === "pooled.db.prisma.io";
}

/**
 * Нормализованный DATABASE_URL с лимитами пула для Next HMR.
 * undefined — только когда переменная не задана (build без БД).
 * Параметры дописываем строкой: `new URL().toString()` может испортить пароль.
 */
export function resolveDatabaseUrl(
  raw: string | undefined = getServerEnv().DATABASE_URL,
): string | undefined {
  if (!raw) return undefined;

  let url = raw;
  url = appendQueryParam(url, "connection_limit", "5");
  url = appendQueryParam(url, "pool_timeout", "20");
  if (isPooledDatabaseHost(url)) {
    url = appendQueryParam(url, "pgbouncer", "true");
  }
  return url;
}
