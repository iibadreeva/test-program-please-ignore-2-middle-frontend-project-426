import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderItemsUnavailableError } from "@/server/errors";

const addBreadcrumb = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb,
  captureException: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    $transaction: transaction,
  },
}));

describe("createOrder observability", () => {
  beforeEach(() => {
    addBreadcrumb.mockClear();
    transaction.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("логирует order.created при успехе", async () => {
    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        product: {
          findMany: async () => [
            { id: "p1", title: "GPU", price: 1000, imageUrl: null, stock: 5 },
          ],
          updateMany: async () => ({ count: 1 }),
        },
        order: {
          create: async () => ({
            id: "ord-1",
            status: "PAID",
            deliveryType: "PICKUP",
            address: null,
            recipientName: "Иван",
            phone: "+79990001122",
            total: 1000,
            createdAt,
            items: [
              {
                id: "li-1",
                productId: "p1",
                titleSnapshot: "GPU",
                priceSnapshot: 1000,
                imageUrlSnapshot: "",
                quantity: 1,
              },
            ],
          }),
        },
      };
      return fn(tx);
    });

    const { createOrder } = await import("@/server/services/orders");
    await createOrder("user-1", {
      deliveryType: "pickup",
      recipientName: "Иван",
      phone: "+79990001122",
      items: [{ productId: "p1", quantity: 1 }],
    });

    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: "order.created" }),
    );
  });

  it("логирует order.stock_conflict при отказе по остатку", async () => {
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        product: {
          findMany: async () => [
            { id: "p1", title: "GPU", price: 1000, imageUrl: null, stock: 0 },
          ],
        },
      };
      return fn(tx);
    });

    const { createOrder } = await import("@/server/services/orders");
    await expect(
      createOrder("user-1", {
        deliveryType: "pickup",
        recipientName: "Иван",
        phone: "+79990001122",
        items: [{ productId: "p1", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(OrderItemsUnavailableError);

    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: "order.stock_conflict" }),
    );
  });
});
