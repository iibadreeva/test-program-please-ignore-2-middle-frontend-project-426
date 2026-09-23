import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CheckoutForm } from "@/features/checkout-form";
import { useCartStore } from "@/features/cart/store";
import type { UseCartMergedResult } from "@/features/cart/use-cart-merged";
import { checkoutSuccessPath } from "@/shared/auth-next";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/cart/use-cart-merged", () => ({
  useCartMerged: vi.fn(),
}));

vi.mock("@/features/checkout-actions", () => ({
  checkoutAction: vi.fn(async () => ({ ok: false, message: "fail" })),
}));

import { useCartMerged } from "@/features/cart/use-cart-merged";
import { checkoutAction } from "@/features/checkout-actions";

const mockedUseCartMerged = vi.mocked(useCartMerged);
const mockedCheckoutAction = vi.mocked(checkoutAction);

function cartMerged(overrides: Partial<UseCartMergedResult> = {}): UseCartMergedResult {
  return {
    hydrated: true,
    refs: [{ productId: "prod-1", quantity: 1 }],
    merged: {
      lines: [
        {
          productId: "prod-1",
          quantity: 1,
          product: {
            id: "prod-1",
            slug: "gpu",
            title: "GPU",
            description: "desc",
            price: "1000",
            imageUrl: null,
            stock: 5,
            available: true,
            rating: 5,
            category: { id: "c1", slug: "gpu", name: "GPU" },
            brand: { id: "b1", slug: "nv", name: "NV" },
          },
          lineTotal: "1000",
        },
      ],
      broken: [],
      total: "1000",
      itemsCount: 1,
    },
    status: "ready",
    error: null,
    pending: false,
    ...overrides,
  };
}

describe("CheckoutForm", () => {
  beforeEach(() => {
    mockedUseCartMerged.mockReset();
    mockedUseCartMerged.mockReturnValue(cartMerged());
    mockedCheckoutAction.mockReset();
    mockedCheckoutAction.mockResolvedValue({ ok: false, message: "fail" });
    replace.mockClear();
    useCartStore.setState({ refs: [{ productId: "prod-1", quantity: 1 }], hydrated: true });
  });

  it("shows address for delivery and hides it for pickup", () => {
    render(<CheckoutForm defaultName="Иван" />);

    expect(screen.getByTestId("checkout-form")).toBeTruthy();
    expect(screen.getByTestId("checkout-method")).toBeTruthy();
    expect(screen.getByTestId("checkout-address")).toBeTruthy();
    expect(screen.getByTestId("checkout-name")).toBeTruthy();
    expect(screen.getByTestId("checkout-phone")).toBeTruthy();
    expect(screen.getByTestId("checkout-submit")).toBeTruthy();

    fireEvent.change(screen.getByTestId("checkout-method"), { target: { value: "pickup" } });
    expect(screen.queryByTestId("checkout-address")).toBeNull();

    fireEvent.change(screen.getByTestId("checkout-method"), { target: { value: "delivery" } });
    expect(screen.getByTestId("checkout-address")).toBeTruthy();
  });

  it("shows empty state when cart refs are empty", () => {
    mockedUseCartMerged.mockReturnValue(
      cartMerged({
        refs: [],
        merged: { lines: [], broken: [], total: "0", itemsCount: 0 },
      }),
    );
    render(<CheckoutForm />);
    expect(screen.getByTestId("checkout-empty")).toBeTruthy();
    expect(screen.queryByTestId("checkout-form")).toBeNull();
  });

  it("uses checkout-catalog-error for catalog load failure, not order-error", () => {
    mockedUseCartMerged.mockReturnValue(
      cartMerged({
        error: "Не удалось загрузить каталог",
        status: "error",
        pending: false,
      }),
    );
    render(<CheckoutForm />);
    expect(screen.getByTestId("checkout-catalog-error").textContent).toContain(
      "Не удалось загрузить каталог",
    );
    expect(screen.queryByTestId("order-error")).toBeNull();
    expect(screen.queryByTestId("checkout-form")).toBeNull();
  });

  it("shows field errors next to name and phone", async () => {
    mockedCheckoutAction.mockResolvedValue({
      ok: false,
      message: "Проверьте поля формы",
      fieldErrors: {
        recipientName: ["Укажите имя получателя"],
        phone: ["Некорректный телефон"],
      },
    });

    render(<CheckoutForm defaultName="Иван" />);
    fireEvent.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(screen.getByText("Укажите имя получателя")).toBeTruthy();
      expect(screen.getByText("Некорректный телефон")).toBeTruthy();
      expect(screen.getByTestId("order-error").textContent).toContain("Проверьте поля формы");
    });
  });

  it("navigates to success via checkoutSuccessPath", async () => {
    mockedCheckoutAction.mockResolvedValue({ ok: true, orderId: "ord/1?x=y" });

    render(<CheckoutForm defaultName="Иван" />);
    fireEvent.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(checkoutSuccessPath("ord/1?x=y"));
    });
    expect(replace.mock.calls[0]![0]).toBe(
      `/checkout/success?order=${encodeURIComponent("ord/1?x=y")}`,
    );
  });

  it("passes syncClamped: false so unavailable items reach the server", () => {
    render(<CheckoutForm />);
    expect(mockedUseCartMerged).toHaveBeenCalledWith({ syncClamped: false });
  });
});
