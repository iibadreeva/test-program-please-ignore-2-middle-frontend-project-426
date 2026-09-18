import { describe, expect, it } from "vitest";
import { addCartItemBodySchema, loginBodySchema, registerBodySchema } from "@/shared/api-contract";

describe("addCartItemBodySchema", () => {
  it("rejects empty productId", () => {
    const parsed = addCartItemBodySchema.safeParse({ productId: "", quantity: 1 });
    expect(parsed.success).toBe(false);
  });

  it("accepts non-empty productId", () => {
    const parsed = addCartItemBodySchema.safeParse({ productId: "prod-1" });
    expect(parsed.success).toBe(true);
  });
});

describe("registerBodySchema", () => {
  it("rejects empty email", () => {
    expect(registerBodySchema.safeParse({ email: "", password: "password1" }).success).toBe(
      false,
    );
  });

  it("rejects non-email string", () => {
    expect(
      registerBodySchema.safeParse({ email: "not-an-email", password: "password1" }).success,
    ).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    expect(
      registerBodySchema.safeParse({ email: "a@b.c", password: "short" }).success,
    ).toBe(false);
  });

  it("accepts body without name", () => {
    const parsed = registerBodySchema.safeParse({
      email: "user@example.com",
      password: "password1",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("loginBodySchema", () => {
  it("rejects empty password", () => {
    expect(loginBodySchema.safeParse({ email: "a@b.c", password: "" }).success).toBe(false);
  });

  it("accepts valid credentials shape", () => {
    expect(
      loginBodySchema.safeParse({ email: "user@example.com", password: "x" }).success,
    ).toBe(true);
  });
});
