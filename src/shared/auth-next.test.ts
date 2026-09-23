import { describe, expect, it } from "vitest";
import {
  accountOrderListPath,
  checkoutSuccessPath,
  loginHref,
  loginNextFromRequest,
  resolveLoginNext,
} from "@/shared/auth-next";

describe("resolveLoginNext", () => {
  it("keeps safe in-app paths with query", () => {
    expect(resolveLoginNext("/checkout/success?order=ord-1")).toBe(
      "/checkout/success?order=ord-1",
    );
    expect(resolveLoginNext("/account?order=ord-2")).toBe("/account?order=ord-2");
    expect(resolveLoginNext("/cart")).toBe("/cart");
    expect(resolveLoginNext("/catalog")).toBe("/catalog");
    expect(resolveLoginNext("/products/gpu")).toBe("/products/gpu");
  });

  it("falls back for empty or missing", () => {
    expect(resolveLoginNext(undefined)).toBe("/account");
    expect(resolveLoginNext(null)).toBe("/account");
    expect(resolveLoginNext("")).toBe("/account");
    expect(resolveLoginNext("   ")).toBe("/account");
  });

  it("rejects protocol-relative and external redirects", () => {
    expect(resolveLoginNext("//evil.com")).toBe("/account");
    expect(resolveLoginNext("//evil.com/phish")).toBe("/account");
    expect(resolveLoginNext("https://evil.com")).toBe("/account");
    expect(resolveLoginNext("http://evil.com/path")).toBe("/account");
  });

  it("rejects backslash and userinfo tricks", () => {
    expect(resolveLoginNext("/\\evil.com")).toBe("/account");
    expect(resolveLoginNext("/\\\\evil.com")).toBe("/account");
    expect(resolveLoginNext("/@evil.com")).toBe("/account");
    expect(resolveLoginNext("/account@evil.com")).toBe("/account");
  });

  it("rejects paths outside the allowlist", () => {
    expect(resolveLoginNext("/login")).toBe("/account");
    expect(resolveLoginNext("/api/orders")).toBe("/account");
    expect(resolveLoginNext("/")).toBe("/account");
    expect(resolveLoginNext("/sentry-example-page")).toBe("/account");
  });

  it("accepts a custom fallback", () => {
    expect(resolveLoginNext("//evil.com", "/cart")).toBe("/cart");
  });
});

describe("loginNextFromRequest", () => {
  it("keeps search params so success order survives login", () => {
    expect(loginNextFromRequest("/checkout/success", "?order=ord-1")).toBe(
      "/checkout/success?order=ord-1",
    );
  });

  it("keeps account order deep-link query", () => {
    expect(loginNextFromRequest("/account", "?order=ord-2")).toBe("/account?order=ord-2");
  });

  it("returns pathname alone when search is empty", () => {
    expect(loginNextFromRequest("/checkout", "")).toBe("/checkout");
    expect(loginNextFromRequest("/checkout", "?")).toBe("/checkout");
  });

  it("does not emit unsafe next from odd pathname", () => {
    expect(loginNextFromRequest("//evil.com", "")).toBe("/account");
  });
});

describe("loginHref / path helpers", () => {
  it("builds login href with encoded success next", () => {
    expect(loginHref(checkoutSuccessPath("ord-1"))).toBe(
      `/login?next=${encodeURIComponent("/checkout/success?order=ord-1")}`,
    );
  });

  it("falls back to success without order id", () => {
    expect(checkoutSuccessPath()).toBe("/checkout/success");
    expect(loginHref(checkoutSuccessPath())).toBe(
      `/login?next=${encodeURIComponent("/checkout/success")}`,
    );
  });

  it("builds account list path with open order", () => {
    expect(accountOrderListPath("ord-9")).toBe("/account?order=ord-9");
  });

  it("sanitizes unsafe next inside loginHref", () => {
    expect(loginHref("//evil.com")).toBe(
      `/login?next=${encodeURIComponent("/account")}`,
    );
  });
});
