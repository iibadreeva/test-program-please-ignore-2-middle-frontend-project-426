import { describe, expect, it } from "vitest";
import { productStockDecrementArgs } from "@/server/repositories/orders.repository";

describe("productStockDecrementArgs", () => {
  it("требует stock >= quantity, чтобы гонка checkout не уводила остаток в минус", () => {
    expect(productStockDecrementArgs("prod-1", 3)).toEqual({
      where: { id: "prod-1", stock: { gte: 3 } },
      data: { stock: { decrement: 3 } },
    });
  });
});
