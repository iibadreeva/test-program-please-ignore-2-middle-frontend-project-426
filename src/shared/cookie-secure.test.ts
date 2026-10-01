import { afterEach, describe, expect, it } from "vitest";
import { isCookieSecure } from "@/shared/cookie-secure";

describe("isCookieSecure", () => {
  const prev = process.env.COOKIE_SECURE;

  afterEach(() => {
    if (prev === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = prev;
  });

  it("true для 'true' и '1'", () => {
    process.env.COOKIE_SECURE = "true";
    expect(isCookieSecure()).toBe(true);
    process.env.COOKIE_SECURE = "1";
    expect(isCookieSecure()).toBe(true);
  });

  it("false если не задан или другое значение", () => {
    delete process.env.COOKIE_SECURE;
    expect(isCookieSecure()).toBe(false);
    process.env.COOKIE_SECURE = "yes";
    expect(isCookieSecure()).toBe(false);
  });
});
