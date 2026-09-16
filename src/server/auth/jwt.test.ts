import { afterEach, describe, expect, it } from "vitest";
import { resetSessionSecretCache, signSessionToken, verifySessionToken } from "@/server/auth/jwt";

const originalJwt = process.env.JWT_SECRET;
const originalDb = process.env.DATABASE_URL;

afterEach(() => {
  resetSessionSecretCache();
  if (originalJwt === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwt;
  if (originalDb === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDb;
});

describe("session JWT secret", () => {
  it("signs and verifies with JWT_SECRET when set", async () => {
    process.env.JWT_SECRET = "test-secret-at-least-16";
    delete process.env.DATABASE_URL;

    const token = await signSessionToken(
      { sub: "u1", email: "a@b.c", name: "Ann" },
      60,
    );
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ sub: "u1", email: "a@b.c", name: "Ann" });
  });

  it("falls back to DATABASE_URL when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";

    const token = await signSessionToken(
      { sub: "u2", email: "b@c.d", name: "Bob" },
      60,
    );
    expect(await verifySessionToken(token)).toMatchObject({ sub: "u2" });
  });

  it("ignores JWT_SECRET shorter than 16 chars and uses DATABASE_URL", async () => {
    process.env.JWT_SECRET = "short";
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";

    const token = await signSessionToken(
      { sub: "u3", email: "c@d.e", name: "Cat" },
      60,
    );
    expect(await verifySessionToken(token)).toMatchObject({ sub: "u3" });
  });

  it("resetSessionSecretCache allows switching secrets between calls", async () => {
    process.env.JWT_SECRET = "first-secret-16chars";
    delete process.env.DATABASE_URL;
    const tokenA = await signSessionToken(
      { sub: "u4", email: "d@e.f", name: "Dan" },
      60,
    );

    resetSessionSecretCache();
    process.env.JWT_SECRET = "second-secret-16char";
    const tokenB = await signSessionToken(
      { sub: "u4", email: "d@e.f", name: "Dan" },
      60,
    );

    expect(await verifySessionToken(tokenB)).toMatchObject({ sub: "u4" });
    resetSessionSecretCache();
    process.env.JWT_SECRET = "first-secret-16chars";
    expect(await verifySessionToken(tokenA)).toMatchObject({ sub: "u4" });
  });
});
