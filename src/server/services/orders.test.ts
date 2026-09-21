import { describe, expect, it } from "vitest";
import {
  aggregateOrderItems,
  createOrderSchema,
  OrderError,
  stockDecrementArgs,
} from "@/server/services/orders";
import { MAX_CART_IDS, MAX_CART_LINE_QTY } from "@/shared/constants";

const sampleItems = [{ productId: "prod-1", quantity: 1 }];

describe("aggregateOrderItems", () => {
  it("sums quantities for duplicate productIds", () => {
    expect(
      aggregateOrderItems([
        { productId: "a", quantity: 2 },
        { productId: "b", quantity: 1 },
        { productId: "a", quantity: 3 },
      ]),
    ).toEqual([
      { productId: "a", quantity: 5 },
      { productId: "b", quantity: 1 },
    ]);
  });

  it("caps aggregated quantity at MAX_CART_LINE_QTY", () => {
    expect(
      aggregateOrderItems([
        { productId: "a", quantity: MAX_CART_LINE_QTY },
        { productId: "a", quantity: MAX_CART_LINE_QTY },
      ]),
    ).toEqual([{ productId: "a", quantity: MAX_CART_LINE_QTY }]);
  });

  it("rejects more than MAX_CART_IDS distinct products", () => {
    const items = Array.from({ length: MAX_CART_IDS + 5 }, (_, i) => ({
      productId: `prod-${i}`,
      quantity: 1,
    }));
    expect(() => aggregateOrderItems(items)).toThrow(OrderError);
    expect(() => aggregateOrderItems(items)).toThrow(/не больше/);
  });
});

describe("stockDecrementArgs", () => {
  it("requires stock >= quantity so concurrent checkout cannot go negative", () => {
    expect(stockDecrementArgs("prod-1", 3)).toEqual({
      where: { id: "prod-1", stock: { gte: 3 } },
      data: { stock: { decrement: 3 } },
    });
  });
});

describe("createOrderSchema", () => {
  it("requires address for delivery", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "DELIVERY",
      recipientName: "Иван",
      phone: "+79990001122",
      items: sampleItems,
    });
    expect(result.success).toBe(false);
  });

  it("requires pickupPointId for pickup", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "PICKUP",
      recipientName: "Иван",
      phone: "+79990001122",
      items: sampleItems,
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one item", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "DELIVERY",
      address: "Москва, Тверская 1",
      recipientName: "Иван",
      phone: "+79990001122",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid delivery payload", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "DELIVERY",
      address: "Москва, Тверская 1",
      recipientName: "Иван",
      phone: "+79990001122",
      items: sampleItems,
    });
    expect(result.success).toBe(true);
  });
});
