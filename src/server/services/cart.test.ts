import { describe, expect, it } from "vitest";

function cartTotal(
  items: { price: number; quantity: number }[],
): { total: number; itemsCount: number } {
  return {
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    itemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

describe("cart totals (rubles)", () => {
  it("sums line totals", () => {
    expect(
      cartTotal([
        { price: 1000, quantity: 2 },
        { price: 500, quantity: 1 },
      ]),
    ).toEqual({ total: 2500, itemsCount: 3 });
  });

  it("handles empty cart", () => {
    expect(cartTotal([])).toEqual({ total: 0, itemsCount: 0 });
  });
});
