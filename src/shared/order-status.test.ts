import { describe, expect, it } from "vitest";
import { orderStatusLabel } from "@/shared/order-status";

describe("orderStatusLabel", () => {
  it("maps paid to Оплачен", () => {
    expect(orderStatusLabel("paid")).toBe("Оплачен");
  });

  it("returns unknown statuses as-is", () => {
    expect(orderStatusLabel("shipped")).toBe("shipped");
  });
});
