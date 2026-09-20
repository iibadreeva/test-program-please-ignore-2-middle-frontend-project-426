import { describe, expect, it } from "vitest";
import {
  addCartItemBodySchema,
  listProductsQuerySchema,
  loginBodySchema,
  PRODUCTS_PER_PAGE,
  registerBodySchema,
} from "@/shared/api-contract";

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

describe("listProductsQuerySchema", () => {
  it("applies pagination and sort defaults to an empty query", () => {
    expect(listProductsQuerySchema.parse({})).toEqual({
      sort: "newest",
      page: 1,
      perPage: PRODUCTS_PER_PAGE,
    });
  });

  it("coerces numeric params coming in as strings", () => {
    const parsed = listProductsQuerySchema.parse({
      page: "3",
      perPage: "24",
      minPrice: "1000",
      maxPrice: "90000",
    });
    expect(parsed).toMatchObject({ page: 3, perPage: 24, minPrice: 1000, maxPrice: 90000 });
  });

  it("reads availability as a real boolean, not just a truthy string", () => {
    expect(listProductsQuerySchema.parse({ available: "true" }).available).toBe(true);
    expect(listProductsQuerySchema.parse({ available: "false" }).available).toBe(false);
    expect(listProductsQuerySchema.parse({}).available).toBeUndefined();
  });

  it("rejects an unparseable availability value", () => {
    expect(listProductsQuerySchema.safeParse({ available: "maybe" }).success).toBe(false);
  });

  it("rejects a page outside the allowed range", () => {
    expect(listProductsQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(listProductsQuerySchema.safeParse({ page: "-1" }).success).toBe(false);
    expect(listProductsQuerySchema.safeParse({ page: "1.5" }).success).toBe(false);
  });

  it("rejects a perPage above the app limit", () => {
    expect(listProductsQuerySchema.safeParse({ perPage: "49" }).success).toBe(false);
  });

  it("rejects a negative price bound", () => {
    expect(listProductsQuerySchema.safeParse({ minPrice: "-1" }).success).toBe(false);
  });

  it("rejects an unknown sort value", () => {
    expect(listProductsQuerySchema.safeParse({ sort: "title_asc" }).success).toBe(false);
  });
});
