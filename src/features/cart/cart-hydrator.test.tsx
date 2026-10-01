import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { CartHydrator } from "@/features/cart/cart-hydrator";
import { __resetCartCatalogForTests } from "@/features/cart/cart-catalog";
import { useCartStore } from "@/features/cart/store";
import type { ProductSummary } from "@/shared/api-contract";

const pathnameRef = { current: "/catalog" };

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.current,
}));

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

describe("CartHydrator", () => {
  beforeEach(() => {
    localStorage.clear();
    __resetCartCatalogForTests();
    pathnameRef.current = "/catalog";
    useCartStore.setState({ refs: [], hydrated: false });
    mockedGetCartProducts.mockReset();
    mockedGetCartProducts.mockResolvedValue([product()]);
    vi.spyOn(useCartStore.persist, "rehydrate").mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("на /cart не запрашивает каталог (shell принадлежит CartView)", async () => {
    pathnameRef.current = "/cart";
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 1 }],
      hydrated: false,
    });

    render(<CartHydrator />);

    await waitFor(() => {
      expect(useCartStore.getState().hydrated).toBe(true);
    });
    expect(mockedGetCartProducts).not.toHaveBeenCalled();
  });

  it("на /checkout не запрашивает каталог (shell принадлежит CheckoutForm)", async () => {
    pathnameRef.current = "/checkout";
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 1 }],
      hydrated: false,
    });

    render(<CartHydrator />);

    await waitFor(() => {
      expect(useCartStore.getState().hydrated).toBe(true);
    });
    expect(mockedGetCartProducts).not.toHaveBeenCalled();
  });

  it("вне shell один раз грузит каталог и клампит, без повторного fetch при том же pathname", async () => {
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 99 }],
      hydrated: false,
    });
    mockedGetCartProducts.mockResolvedValue([product({ stock: 2, available: true })]);

    const { rerender } = render(<CartHydrator />);

    await waitFor(() => {
      expect(mockedGetCartProducts).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 2 }]);
    });

    pathnameRef.current = "/products/gpu";
    rerender(<CartHydrator />);
    pathnameRef.current = "/catalog";
    rerender(<CartHydrator />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedGetCartProducts).toHaveBeenCalledTimes(1);
  });

  it("при возврате на вкладку повторно запрашивает каталог вне shell", async () => {
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 1 }],
      hydrated: false,
    });

    render(<CartHydrator />);

    await waitFor(() => {
      expect(mockedGetCartProducts).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(useCartStore.getState().refs[0]?.quantity).toBe(1);
    });

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(mockedGetCartProducts).toHaveBeenCalledTimes(2);
    });
  });

  it("после ухода с /cart на каталог делает один фоновый clamp", async () => {
    pathnameRef.current = "/cart";
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 5 }],
      hydrated: false,
    });
    mockedGetCartProducts.mockResolvedValue([product({ stock: 3, available: true })]);

    const { rerender } = render(<CartHydrator />);

    await waitFor(() => {
      expect(useCartStore.getState().hydrated).toBe(true);
    });
    expect(mockedGetCartProducts).not.toHaveBeenCalled();

    pathnameRef.current = "/catalog";
    rerender(<CartHydrator />);

    await waitFor(() => {
      expect(mockedGetCartProducts).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 3 }]);
    });
  });

  it("при смене productId с той же длиной корзины снова запрашивает каталог", async () => {
    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 5 }],
      hydrated: false,
    });
    mockedGetCartProducts
      .mockResolvedValueOnce([product({ id: "prod-1", stock: 2, available: true })])
      .mockResolvedValueOnce([
        product({ id: "prod-2", slug: "cpu", title: "CPU", stock: 3, available: true }),
      ]);

    render(<CartHydrator />);

    await waitFor(() => {
      expect(mockedGetCartProducts).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 2 }]);
    });

    act(() => {
      useCartStore.setState({ refs: [{ productId: "prod-2", quantity: 9 }] });
    });

    await waitFor(() => {
      expect(mockedGetCartProducts).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(useCartStore.getState().refs).toEqual([{ productId: "prod-2", quantity: 3 }]);
    });
  });

  it("уход на /cart mid-fetch и возврат на каталог снова клампит", async () => {
    let resolveCatalog!: (value: ProductSummary[]) => void;
    const firstLoad = new Promise<ProductSummary[]>((resolve) => {
      resolveCatalog = resolve;
    });
    mockedGetCartProducts
      .mockImplementationOnce(() => firstLoad)
      .mockResolvedValueOnce([product({ stock: 2, available: true })]);

    useCartStore.setState({
      refs: [{ productId: "prod-1", quantity: 9 }],
      hydrated: false,
    });

    const { rerender } = render(<CartHydrator />);

    await waitFor(() => {
      expect(mockedGetCartProducts).toHaveBeenCalledTimes(1);
    });

    pathnameRef.current = "/cart";
    rerender(<CartHydrator />);

    await act(async () => {
      resolveCatalog([product({ stock: 10, available: true })]);
      await firstLoad;
    });
    // На shell фоновый clamp не применяет stale-ответ.
    expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 9 }]);

    pathnameRef.current = "/catalog";
    rerender(<CartHydrator />);

    await waitFor(() => {
      expect(mockedGetCartProducts).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(useCartStore.getState().refs).toEqual([{ productId: "prod-1", quantity: 2 }]);
    });
  });
});
