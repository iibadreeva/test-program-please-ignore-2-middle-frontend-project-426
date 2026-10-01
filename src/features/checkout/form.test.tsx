import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { CheckoutForm } from "@/features/checkout/form";
import { useCartStore } from "@/features/cart/store";
import type { UseCartMergedResult } from "@/features/cart/use-cart-merged";
import { checkoutSuccessPath } from "@/shared/auth-next";

const replace = vi.fn();
const captureException = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException,
}));

vi.mock("@/features/cart/use-cart-merged", () => ({
  useCartMerged: vi.fn(),
}));

vi.mock("@/features/checkout/actions", () => ({
  checkoutAction: vi.fn(async () => ({ ok: false, message: "fail" })),
}));

import { useCartMerged } from "@/features/cart/use-cart-merged";
import { checkoutAction } from "@/features/checkout/actions";
import {
  CHECKOUT_CART_PENDING_KEY,
  readCheckoutPending,
} from "@/features/cart/checkout-cart-snapshot";

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

function fillValidDelivery() {
  fireEvent.change(screen.getByTestId("checkout-address"), {
    target: { value: "Москва, Тверская 1" },
  });
  fireEvent.change(screen.getByTestId("checkout-name"), { target: { value: "Иван" } });
  fireEvent.change(screen.getByTestId("checkout-phone"), { target: { value: "+79990001122" } });
}

describe("CheckoutForm", () => {
  beforeEach(() => {
    mockedUseCartMerged.mockReset();
    mockedUseCartMerged.mockReturnValue(cartMerged());
    mockedCheckoutAction.mockReset();
    mockedCheckoutAction.mockResolvedValue({ ok: false, message: "fail" });
    replace.mockClear();
    useCartStore.setState({ refs: [{ productId: "prod-1", quantity: 1 }], hydrated: true });
    localStorage.removeItem(CHECKOUT_CART_PENDING_KEY);
    captureException.mockClear();
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
    fillValidDelivery();
    fireEvent.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(screen.getByText("Укажите имя получателя")).toBeTruthy();
      expect(screen.getByText("Некорректный телефон")).toBeTruthy();
      expect(screen.getByTestId("order-error").textContent).toContain("Проверьте поля формы");
    });
    expect(mockedCheckoutAction).toHaveBeenCalled();
  });

  it("показывает ошибки общих полей и не вызывает сервер", async () => {
    render(<CheckoutForm />);
    fireEvent.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(screen.getByText("Укажите имя получателя")).toBeTruthy();
      expect(screen.getByText("Укажите телефон")).toBeTruthy();
      expect(screen.getByText("Укажите адрес доставки")).toBeTruthy();
    });
    expect(mockedCheckoutAction).not.toHaveBeenCalled();
    expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 1 }]);
    expect(screen.queryByTestId("order-error")).toBeNull();
  });

  it("связывает ошибку поля с инпутом для скринридера", async () => {
    render(<CheckoutForm />);
    fireEvent.click(screen.getByTestId("checkout-submit"));

    const name = screen.getByTestId("checkout-name");
    const phone = screen.getByTestId("checkout-phone");
    const address = screen.getByTestId("checkout-address");

    await waitFor(() => {
      expect(name.getAttribute("aria-invalid")).toBe("true");
    });

    for (const [field, message] of [
      [name, "Укажите имя получателя"],
      [phone, "Укажите телефон"],
      [address, "Укажите адрес доставки"],
    ] as const) {
      expect(field.getAttribute("aria-invalid")).toBe("true");
      const errorId = field.getAttribute("aria-describedby");
      expect(errorId).toBeTruthy();
      const error = document.getElementById(errorId!);
      expect(error?.textContent).toBe(message);
      expect(error?.getAttribute("role")).toBe("alert");
    }

    fireEvent.change(name, { target: { value: "Иван" } });

    await waitFor(() => {
      expect(name.getAttribute("aria-invalid")).toBeNull();
      expect(name.getAttribute("aria-describedby")).toBeNull();
    });
    expect(phone.getAttribute("aria-invalid")).toBe("true");
  });

  it("при самовывозе не требует адрес", async () => {
    mockedCheckoutAction.mockResolvedValue({ ok: true, orderId: "ord-1" });
    render(<CheckoutForm defaultName="Иван" />);
    fireEvent.change(screen.getByTestId("checkout-method"), { target: { value: "pickup" } });
    fireEvent.change(screen.getByTestId("checkout-phone"), { target: { value: "+79990001122" } });
    fireEvent.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(mockedCheckoutAction).toHaveBeenCalled();
    });
  });

  it("navigates to success via checkoutSuccessPath", async () => {
    mockedCheckoutAction.mockResolvedValue({ ok: true, orderId: "ord/1?x=y" });

    render(<CheckoutForm defaultName="Иван" />);
    fillValidDelivery();
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

  it("сбрасывает ошибку поля при вводе текста в это поле", async () => {
    render(<CheckoutForm />);
    fireEvent.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(screen.getByText("Укажите имя получателя")).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId("checkout-name"), { target: { value: "Иван" } });

    await waitFor(() => {
      expect(screen.queryByText("Укажите имя получателя")).toBeNull();
      // Ошибки по другим незаполненным полям остаются
      expect(screen.getByText("Укажите телефон")).toBeTruthy();
    });
  });

  it("сохраняет введённые данные в полях при повторных попытках отправки", async () => {
    mockedCheckoutAction.mockResolvedValue({
      ok: false,
      message: "Ошибка сервера",
    });

    render(<CheckoutForm />);
    fireEvent.change(screen.getByTestId("checkout-name"), { target: { value: "Иван Иванов" } });
    fireEvent.change(screen.getByTestId("checkout-phone"), { target: { value: "+79991112233" } });
    fireEvent.change(screen.getByTestId("checkout-address"), {
      target: { value: "г. Москва, ул. Ленина, д. 10" },
    });

    fireEvent.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("order-error").textContent).toContain("Ошибка сервера");
    });

    expect((screen.getByTestId("checkout-name") as HTMLInputElement).value).toBe("Иван Иванов");
    expect((screen.getByTestId("checkout-phone") as HTMLInputElement).value).toBe(
      "+7 (999) 111-22-33",
    );
    expect((screen.getByTestId("checkout-address") as HTMLTextAreaElement).value).toBe(
      "г. Москва, ул. Ленина, д. 10",
    );
    expect(captureException).not.toHaveBeenCalled();
  });

  it("до чтения снимка не показывает пустую корзину", () => {
    localStorage.setItem(
      CHECKOUT_CART_PENDING_KEY,
      JSON.stringify({
        refs: [{ productId: "prod-1", quantity: 1 }],
        status: "unconfirmed",
      }),
    );
    useCartStore.setState({ refs: [], hydrated: true });
    mockedUseCartMerged.mockReturnValue(
      cartMerged({
        refs: [],
        merged: { lines: [], broken: [], total: "0", itemsCount: 0 },
      }),
    );

    const html = renderToString(<CheckoutForm />);

    expect(html).toContain('data-testid="checkout-loading"');
    expect(html).not.toContain('data-testid="checkout-empty"');
    expect(html).not.toContain('data-testid="checkout-unconfirmed"');
  });

  it("после перезагрузки не возвращает неподтверждённую корзину", async () => {
    localStorage.setItem(
      CHECKOUT_CART_PENDING_KEY,
      JSON.stringify({
        refs: [{ productId: "prod-1", quantity: 1 }],
        status: "unconfirmed",
      }),
    );
    useCartStore.setState({ refs: [], hydrated: true });
    mockedUseCartMerged.mockReturnValue(
      cartMerged({
        refs: [],
        merged: { lines: [], broken: [], total: "0", itemsCount: 0 },
      }),
    );

    render(<CheckoutForm />);

    await waitFor(() => {
      expect(screen.getByTestId("checkout-unconfirmed")).toBeTruthy();
    });
    expect(useCartStore.getState().refs).toEqual([]);
    expect(screen.queryByTestId("checkout-form")).toBeNull();
  });

  it("не возвращает корзину, если ответ оформления потерян", async () => {
    const error = new Error("network");
    mockedCheckoutAction.mockRejectedValue(error);
    render(<CheckoutForm />);
    fillValidDelivery();
    fireEvent.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-unconfirmed").textContent).toContain("личном кабинете");
    });
    expect(screen.queryByTestId("checkout-form")).toBeNull();
    expect(useCartStore.getState().refs).toEqual([]);
    expect(readCheckoutPending()).toEqual({
      refs: [{ productId: "prod-1", quantity: 1 }],
      status: "unconfirmed",
    });
    expect(captureException).toHaveBeenCalledWith(error);

    fireEvent.click(screen.getByTestId("checkout-restore-cart"));

    expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 1 }]);
    expect(readCheckoutPending()).toBeNull();
    expect(screen.getByTestId("checkout-form")).toBeTruthy();
  });

  it("оставляет текущую корзину и снимает неподтверждённый снимок", async () => {
    localStorage.setItem(
      CHECKOUT_CART_PENDING_KEY,
      JSON.stringify({
        refs: [{ productId: "prod-1", quantity: 1 }],
        status: "unconfirmed",
      }),
    );
    useCartStore.setState({ refs: [{ productId: "prod-2", quantity: 2 }], hydrated: true });
    mockedUseCartMerged.mockReturnValue(
      cartMerged({
        refs: [{ productId: "prod-2", quantity: 2 }],
        merged: { lines: [], broken: [], total: "0", itemsCount: 2 },
      }),
    );

    render(<CheckoutForm />);

    await waitFor(() => {
      expect(screen.getByTestId("checkout-unconfirmed")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("checkout-keep-cart"));

    expect(useCartStore.getState().refs).toEqual([{ productId: "prod-2", quantity: 2 }]);
    expect(readCheckoutPending()).toBeNull();
    expect(screen.queryByTestId("checkout-unconfirmed")).toBeNull();
    expect(screen.getByTestId("checkout-form")).toBeTruthy();
  });

  it("возврат снимка не затирает товары, добавленные после сбоя", async () => {
    localStorage.setItem(
      CHECKOUT_CART_PENDING_KEY,
      JSON.stringify({
        refs: [{ productId: "prod-1", quantity: 1 }],
        status: "unconfirmed",
      }),
    );
    useCartStore.setState({ refs: [{ productId: "prod-2", quantity: 2 }], hydrated: true });
    mockedUseCartMerged.mockReturnValue(
      cartMerged({
        refs: [{ productId: "prod-2", quantity: 2 }],
        merged: { lines: [], broken: [], total: "0", itemsCount: 2 },
      }),
    );

    render(<CheckoutForm />);

    await waitFor(() => {
      expect(screen.getByTestId("checkout-restore-cart")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("checkout-restore-cart"));

    expect(useCartStore.getState().refs).toEqual([
      { productId: "prod-2", quantity: 2 },
      { productId: "prod-1", quantity: 1 },
    ]);
    expect(readCheckoutPending()).toBeNull();
  });

  it("не отправляет второй заказ повторной отправкой формы", async () => {
    let resolveAction: (value: { ok: true; orderId: string }) => void = () => {};
    mockedCheckoutAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    render(<CheckoutForm />);
    fillValidDelivery();
    const form = screen.getByTestId("checkout-form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    resolveAction({ ok: true, orderId: "ord-1" });

    await waitFor(() => {
      expect(replace).toHaveBeenCalled();
    });
    expect(mockedCheckoutAction).toHaveBeenCalledTimes(1);
  });

  it("применяет маску к номеру телефона и показывает подсказку", () => {
    render(<CheckoutForm />);
    const phoneInput = screen.getByTestId("checkout-phone") as HTMLInputElement;
    const phoneHint = screen.getByTestId("checkout-phone-hint");

    expect(phoneHint.textContent).toContain("Формат: +7 (XXX) XXX-XX-XX");

    fireEvent.change(phoneInput, { target: { value: "9991234567" } });
    expect(phoneInput.value).toBe("+7 (999) 123-45-67");

    fireEvent.change(phoneInput, {
      target: { value: "+7 (99499) 123-45-67", selectionStart: 7 },
    });
    expect(phoneInput.value).toBe("+7 (994) 991-23-45");
    expect(phoneInput.selectionStart).toBe(7);
  });
});
