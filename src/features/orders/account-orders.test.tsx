import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AccountOrders } from "@/features/orders/account-orders";
import type { Order } from "@/shared/api-contract";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-abcdef123456",
    status: "paid",
    deliveryType: "delivery",
    address: "ул. Тест, 1",
    recipientName: "Иван",
    phone: "+79990001122",
    total: "1500",
    createdAt: "2026-01-15T12:00:00.000Z",
    items: [
      {
        id: "item-1",
        productId: "prod-1",
        titleSnapshot: "GPU",
        priceSnapshot: "1000",
        imageUrlSnapshot: "",
        quantity: 1,
        lineTotal: "1000",
      },
      {
        id: "item-2",
        titleSnapshot: "SSD",
        priceSnapshot: "500",
        imageUrlSnapshot: "",
        quantity: 1,
        lineTotal: "500",
      },
    ],
    ...overrides,
  };
}

describe("AccountOrders", () => {
  it("shows empty state", () => {
    render(<AccountOrders orders={[]} />);
    expect(screen.getByTestId("account-orders-empty")).toBeTruthy();
    expect(screen.queryByTestId("account-orders")).toBeNull();
  });

  it("renders order details inside account-order-item", () => {
    render(<AccountOrders orders={[order()]} />);

    const item = screen.getByTestId("account-order-item");
    expect(screen.getByTestId("account-orders")).toBeTruthy();

    fireEvent.click(item.querySelector("summary")!);

    const status = item.querySelector('[data-testid="order-status"]');
    expect(status).toBeTruthy();
    expect(status?.getAttribute("data-status")).toBe("paid");
    expect(status?.textContent).toBe("Оплачен");

    expect(item.querySelectorAll('[data-testid="order-item"]')).toHaveLength(2);
    expect(item.querySelector('[data-testid="order-total"]')?.textContent).toMatch(/1\s500\s₽/);
  });

  it("opens the order from deep link openOrderId", () => {
    const target = order({ id: "ord-open-me" });
    const other = order({ id: "ord-closed" });
    render(<AccountOrders orders={[other, target]} openOrderId="ord-open-me" />);

    const items = screen.getAllByTestId("account-order-item");
    expect(items[0]?.hasAttribute("open")).toBe(false);
    expect(items[1]?.hasAttribute("open")).toBe(true);
  });

  it("allows collapsing a deep-linked open order", () => {
    const target = order({ id: "ord-open-me" });
    render(<AccountOrders orders={[target]} openOrderId="ord-open-me" />);

    const item = screen.getByTestId("account-order-item");
    expect(item.hasAttribute("open")).toBe(true);

    fireEvent.click(item.querySelector("summary")!);
    expect(item.hasAttribute("open")).toBe(false);
  });
});
