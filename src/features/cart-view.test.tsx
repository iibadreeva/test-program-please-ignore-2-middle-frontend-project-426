import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CartView } from "@/features/cart-view";
import { useCartStore } from "@/features/cart/store";
import type { ProductSummary } from "@/shared/api-contract";

vi.mock("@/features/cart/actions", () => ({
  getCartProducts: vi.fn(),
}));

import { getCartProducts } from "@/features/cart/actions";

const mockedGetCartProducts = vi.mocked(getCartProducts);

function product(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "prod-1",
    slug: "gpu",
    title: "GPU",
    description: "Видеокарта",
    price: "1000",
    imageUrl: "/gpu.png",
    stock: 10,
    available: true,
    rating: 4.5,
    category: { id: "c1", slug: "graphics-cards", name: "Видеокарты" },
    brand: { id: "b1", slug: "nvidia", name: "NVIDIA" },
    ...overrides,
  };
}

describe("CartView", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ refs: [], hydrated: true });
    mockedGetCartProducts.mockReset();
  });

  it("shows empty state without checkout link", () => {
    render(<CartView />);
    expect(screen.getByTestId("cart-empty")).toBeTruthy();
    expect(screen.queryByTestId("cart-checkout")).toBeNull();
  });

  it("renders items, recalculates total on qty change, and removes lines", async () => {
    useCartStore.setState({
      refs: [
        { productId: "prod-1", quantity: 2 },
        { productId: "prod-2", quantity: 1 },
      ],
      hydrated: true,
    });
    mockedGetCartProducts.mockResolvedValue([
      product({ id: "prod-1", price: "1000" }),
      product({ id: "prod-2", price: "500", title: "SSD", slug: "ssd" }),
    ]);

    render(<CartView />);

    await waitFor(() => {
      expect(screen.getAllByTestId("cart-item")).toHaveLength(2);
    });
    expect(screen.getByTestId("cart-total").textContent).toMatch(/2\s500\s₽/);

    const qty = screen.getAllByTestId("cart-item-qty")[0] as HTMLInputElement;
    fireEvent.change(qty, { target: { value: "3" } });

    await waitFor(() => {
      expect(screen.getByTestId("cart-total").textContent).toMatch(/3\s500\s₽/);
    });

    fireEvent.click(screen.getAllByTestId("cart-item-remove")[0]!);
    await waitFor(() => {
      expect(screen.getAllByTestId("cart-item")).toHaveLength(1);
    });
  });

  it("drops broken products from the store after catalog resolve", async () => {
    useCartStore.setState({
      refs: [
        { productId: "gone", quantity: 1 },
        { productId: "prod-1", quantity: 1 },
      ],
      hydrated: true,
    });
    mockedGetCartProducts.mockResolvedValue([product()]);

    render(<CartView />);

    await waitFor(() => {
      expect(screen.getAllByTestId("cart-item")).toHaveLength(1);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("cart-item-unavailable")).toBeNull();
      expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 1 }]);
    });
  });

  it("shows empty when catalog resolve leaves only unavailable refs", async () => {
    useCartStore.setState({
      refs: [{ productId: "gone", quantity: 1 }],
      hydrated: true,
    });
    mockedGetCartProducts.mockResolvedValue([]);

    render(<CartView />);

    await waitFor(() => {
      expect(screen.getByTestId("cart-empty")).toBeTruthy();
    });
    expect(screen.queryByTestId("cart-broken")).toBeNull();
    expect(screen.queryByTestId("cart-checkout")).toBeNull();
  });

  it("shows loading while catalog rows are fetched", async () => {
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 1 }],
      hydrated: true,
    });
    let resolveProducts!: (value: ProductSummary[]) => void;
    mockedGetCartProducts.mockReturnValue(
      new Promise((resolve) => {
        resolveProducts = resolve;
      }),
    );

    render(<CartView />);
    expect(screen.getByTestId("cart-loading")).toBeTruthy();
    expect(screen.queryByTestId("cart-empty")).toBeNull();

    resolveProducts([product()]);
    await waitFor(() => {
      expect(screen.getByTestId("cart-item")).toBeTruthy();
    });
  });

  it("shows an error when catalog load fails", async () => {
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 1 }],
      hydrated: true,
    });
    mockedGetCartProducts.mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<CartView />);

    await waitFor(() => {
      expect(screen.getByTestId("cart-error")).toBeTruthy();
    });
    expect(screen.queryByTestId("cart-item-unavailable")).toBeNull();
    consoleError.mockRestore();
  });

  it("clamps overstock quantity back into the store", async () => {
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 5 }],
      hydrated: true,
    });
    mockedGetCartProducts.mockResolvedValue([product({ stock: 2 })]);

    render(<CartView />);

    await waitFor(() => {
      expect(screen.getByTestId("cart-item-qty")).toHaveProperty("value", "2");
    });
    expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 2 }]);
  });
});

