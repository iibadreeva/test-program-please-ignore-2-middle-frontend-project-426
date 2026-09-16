import { describe, expect, it } from "vitest";
import { formatPrice } from "@/shared/format";

describe("formatPrice", () => {
  it("formats kopecks as RUB without fraction", () => {
    expect(formatPrice(6899000)).toMatch(/68[\s\u00a0]?990/);
    expect(formatPrice(6899000)).toMatch(/₽|RUB|руб/i);
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toMatch(/0/);
  });
});
