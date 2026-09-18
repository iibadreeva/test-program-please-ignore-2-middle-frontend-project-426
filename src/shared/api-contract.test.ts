import { describe, expect, it } from "vitest";
import { addCartItemBodySchema } from "@/shared/api-contract";

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
