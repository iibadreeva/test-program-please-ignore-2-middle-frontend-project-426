import { describe, expect, it, afterEach, vi } from "vitest";
import { getServerEnv, resolveDatabaseUrl } from "@/server/config/env";

describe("server/config/env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("читает DATABASE_URL из process.env", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    expect(getServerEnv().DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
  });

  it("добавляет connection_limit и pool_timeout к URL", () => {
    const url = resolveDatabaseUrl("postgresql://u:p@localhost:5432/db");
    expect(url).toContain("connection_limit=5");
    expect(url).toContain("pool_timeout=20");
    expect(url).not.toContain("pgbouncer");
  });

  it("для pooled-хоста отключает prepared statements", () => {
    const url = resolveDatabaseUrl(
      "postgresql://u:p@pooled.db.prisma.io:5432/postgres?sslmode=require",
    );
    expect(url).toContain("pgbouncer=true");
    expect(url).toContain("sslmode=require");
    expect(url).toContain("connection_limit=5");
  });

  it("для pooled-хоста без userinfo тоже ставит pgbouncer", () => {
    const url = resolveDatabaseUrl("postgresql://pooled.db.prisma.io:5432/postgres");
    expect(url).toContain("pgbouncer=true");
    expect(url).toContain("connection_limit=5");
  });

  it("не падает без DATABASE_URL (build без БД)", () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(getServerEnv().DATABASE_URL).toBeUndefined();
    expect(resolveDatabaseUrl()).toBeUndefined();
  });

  it("пустой DATABASE_URL трактует как отсутствие", () => {
    vi.stubEnv("DATABASE_URL", "   ");
    expect(getServerEnv().DATABASE_URL).toBeUndefined();
  });

  it("нестандартный NODE_ENV не бросает, а даёт undefined", () => {
    vi.stubEnv("NODE_ENV", "dev");
    expect(getServerEnv().NODE_ENV).toBeUndefined();
  });

  it("сохраняет уже заданные query-параметры пула", () => {
    const url = resolveDatabaseUrl(
      "postgresql://u:p@localhost:5432/db?connection_limit=2&pool_timeout=5",
    );
    expect(url).toContain("connection_limit=2");
    expect(url).toContain("pool_timeout=5");
    expect(url).not.toContain("connection_limit=5");
  });

  it("не перекодирует credentials при дописывании пула", () => {
    const raw = "postgresql://u:p%40ss%2Fw%3Ard@localhost:5432/db?sslmode=require";
    const url = resolveDatabaseUrl(raw);
    expect(url?.startsWith("postgresql://u:p%40ss%2Fw%3Ard@localhost:5432/db?")).toBe(true);
    expect(url).toContain("sslmode=require");
    expect(url).toContain("connection_limit=5");
    expect(url).toContain("pool_timeout=20");
  });

  it("кэширует снимок при неизменном process.env", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/cache");
    const first = getServerEnv();
    const second = getServerEnv();
    expect(second).toBe(first);
  });

  it("перечитывает env после смены переменных", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/a");
    const first = getServerEnv();
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/b");
    const second = getServerEnv();
    expect(second).not.toBe(first);
    expect(second.DATABASE_URL).toBe("postgresql://u:p@localhost:5432/b");
  });
});
