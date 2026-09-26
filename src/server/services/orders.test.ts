import { describe, expect, it } from "vitest";
import {
  aggregateOrderItems,
  buildOrderLines,
  collectOrderProblems,
  createOrderSchema,
  OrderError,
  raceUnavailableProblem,
  serializeOrder,
  stockDecrementArgs,
} from "@/server/services/orders";
import { MAX_CART_IDS, MAX_CART_LINE_QTY } from "@/shared/constants";
import { DeliveryType, OrderStatus } from "@prisma/client";

const sampleItems = [{ productId: "prod-1", quantity: 1 }];

const catalog = [
  {
    id: "prod-1",
    title: "Видеокарта",
    price: 50_000,
    imageUrl: "/gpu.jpg",
    stock: 5,
  },
  {
    id: "prod-2",
    title: "Процессор",
    price: 20_000,
    imageUrl: null,
    stock: 0,
  },
];

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

  it("rejects when aggregated quantity exceeds MAX_CART_LINE_QTY", () => {
    expect(() =>
      aggregateOrderItems([
        { productId: "a", quantity: MAX_CART_LINE_QTY },
        { productId: "a", quantity: MAX_CART_LINE_QTY },
      ]),
    ).toThrow(OrderError);
    expect(() =>
      aggregateOrderItems([
        { productId: "a", quantity: MAX_CART_LINE_QTY },
        { productId: "a", quantity: MAX_CART_LINE_QTY },
      ]),
    ).toThrow(/не больше/);
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

describe("collectOrderProblems", () => {
  it("returns all problematic items, not only the first", () => {
    const problems = collectOrderProblems(
      [
        { productId: "missing", quantity: 1 },
        { productId: "prod-2", quantity: 2 },
        { productId: "prod-1", quantity: 1 },
      ],
      catalog,
    );
    expect(problems).toEqual([
      {
        productId: "missing",
        reason: "not_found",
        requested: 1,
        available: 0,
      },
      {
        productId: "prod-2",
        title: "Процессор",
        reason: "unavailable",
        requested: 2,
        available: 0,
      },
    ]);
  });

  it("returns empty list when everything is available", () => {
    expect(collectOrderProblems([{ productId: "prod-1", quantity: 2 }], catalog)).toEqual([]);
  });
});

describe("raceUnavailableProblem", () => {
  it("reports the actual remaining stock, not a hard-coded zero", () => {
    expect(
      raceUnavailableProblem(
        {
          productId: "prod-1",
          titleSnapshot: "Видеокарта",
          priceSnapshot: 50_000,
          imageUrlSnapshot: "",
          quantity: 3,
        },
        2,
      ),
    ).toEqual({
      productId: "prod-1",
      title: "Видеокарта",
      reason: "unavailable",
      requested: 3,
      available: 2,
    });
  });
});

describe("buildOrderLines", () => {
  it("computes total from catalog prices, ignoring client prices", () => {
    const { lines, total } = buildOrderLines(
      [
        { productId: "prod-1", quantity: 2 },
        { productId: "prod-2", quantity: 1 },
      ],
      [
        { ...catalog[0]!, stock: 10 },
        { ...catalog[1]!, stock: 5 },
      ],
    );
    expect(total).toBe(50_000 * 2 + 20_000);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      titleSnapshot: "Видеокарта",
      priceSnapshot: 50_000,
      quantity: 2,
    });
  });
});

describe("createOrderSchema", () => {
  it("requires address for delivery", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "delivery",
      recipientName: "Иван",
      phone: "+79990001122",
      items: sampleItems,
    });
    expect(result.success).toBe(false);
  });

  it("does not require address for pickup", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "pickup",
      recipientName: "Иван",
      phone: "+79990001122",
      items: sampleItems,
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one item", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "delivery",
      address: "Москва, Тверская 1",
      recipientName: "Иван",
      phone: "+79990001122",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid delivery payload", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "delivery",
      address: "Москва, Тверская 1",
      recipientName: "Иван",
      phone: "+79990001122",
      items: sampleItems,
    });
    expect(result.success).toBe(true);
  });

  it("rejects address longer than 500 characters", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "delivery",
      address: "а".repeat(501),
      recipientName: "Иван",
      phone: "+79990001122",
      items: sampleItems,
    });
    expect(result.success).toBe(false);
  });
});

describe("serializeOrder", () => {
  it("maps OrderStatus.PAID and DeliveryType from Prisma enums", () => {
    const serialized = serializeOrder({
      id: "ord-1",
      userId: "user-1",
      status: OrderStatus.PAID,
      deliveryType: DeliveryType.DELIVERY,
      address: "ул. Тест, 1",
      recipientName: "Иван",
      phone: "+79990001122",
      total: 100_000,
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      updatedAt: new Date("2026-01-15T12:00:00.000Z"),
      items: [
        {
          id: "item-1",
          orderId: "ord-1",
          productId: "prod-1",
          titleSnapshot: "Видеокарта",
          priceSnapshot: 50_000,
          imageUrlSnapshot: "",
          quantity: 2,
        },
      ],
    });

    expect(serialized.status).toBe("paid");
    expect(serialized.deliveryType).toBe("delivery");
    expect(serialized.total).toBe("100000");
    expect(serialized.items[0]?.lineTotal).toBe("100000");
    expect(serialized).not.toHaveProperty("pickupPoint");
    expect(serialized).not.toHaveProperty("comment");
  });
});
