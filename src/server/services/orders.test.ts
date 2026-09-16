import { describe, expect, it } from "vitest";
import { createOrderSchema } from "@/server/services/orders";

describe("createOrderSchema", () => {
  it("requires address for delivery", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "DELIVERY",
      recipientName: "Иван",
      phone: "+79990001122",
    });
    expect(result.success).toBe(false);
  });

  it("requires pickupPointId for pickup", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "PICKUP",
      recipientName: "Иван",
      phone: "+79990001122",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid delivery payload", () => {
    const result = createOrderSchema.safeParse({
      deliveryType: "DELIVERY",
      address: "Москва, Тверская 1",
      recipientName: "Иван",
      phone: "+79990001122",
    });
    expect(result.success).toBe(true);
  });
});
