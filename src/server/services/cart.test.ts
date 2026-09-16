import { describe, expect, it } from "vitest";

function cartTotal(
  items: { priceCents: number; quantity: number }[],
): { totalCents: number; itemsCount: number } {
  return {
    totalCents: items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    itemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

describe("cart totals", () => {
  it("sums line totals and quantities", () => {
    expect(
      cartTotal([
        { priceCents: 1000, quantity: 2 },
        { priceCents: 500, quantity: 1 },
      ]),
    ).toEqual({ totalCents: 2500, itemsCount: 3 });
  });

  it("handles empty cart", () => {
    expect(cartTotal([])).toEqual({ totalCents: 0, itemsCount: 0 });
  });
});
