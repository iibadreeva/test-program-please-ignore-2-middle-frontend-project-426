import { describe, expect, it } from "vitest";
import { generateSessionToken, hashToken } from "@/server/auth/session-token";

describe("session-token", () => {
  it("hashes the same token to the same digest", () => {
    const token = "fixed-token-for-hash-test";
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("does not embed the raw token in the hash", () => {
    const token = generateSessionToken();
    const digest = hashToken(token);
    expect(digest).not.toContain(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique opaque tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});
