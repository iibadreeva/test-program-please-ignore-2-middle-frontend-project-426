import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCartStore } from "@/features/cart/store";
import type { SerializedCart } from "@/server/services/cart";

vi.mock("@/features/cart-actions", () => ({
  addToCartAction: vi.fn(),
  updateCartItemAction: vi.fn(),
  removeCartItemAction: vi.fn(),
  clearCartAction: vi.fn(),
}));

import {
  addToCartAction,
  clearCartAction,
  removeCartItemAction,
  updateCartItemAction,
} from "@/features/cart-actions";

const mockedUpdate = vi.mocked(updateCartItemAction);
const mockedRemove = vi.mocked(removeCartItemAction);
const mockedClear = vi.mocked(clearCartAction);
const mockedAdd = vi.mocked(addToCartAction);

function sampleCart(overrides?: Partial<SerializedCart>): SerializedCart {
  return {
    id: "cart-1",
    items: [
      {
        id: "item-1",
        productId: "prod-1",
        quantity: 2,
        lineTotalCents: 2000,
        product: {
          id: "prod-1",
          slug: "gpu",
          title: "GPU",
          priceCents: 1000,
          oldPriceCents: null,
          imageUrl: "/gpu.png",
          stock: 10,
          rating: 4.5,
          category: { id: "c1", slug: "graphics-cards", name: "Видеокарты" },
          brand: { id: "b1", slug: "nvidia", name: "NVIDIA" },
        },
      },
    ],
    totalCents: 2000,
    itemsCount: 2,
    ...overrides,
  };
}

describe("createCartStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically updates quantity and itemsCount", async () => {
    const store = createCartStore(sampleCart());
    const serverCart = sampleCart({
      items: [
        {
          ...sampleCart().items[0],
          quantity: 3,
          lineTotalCents: 3000,
        },
      ],
      totalCents: 3000,
      itemsCount: 3,
    });
    mockedUpdate.mockResolvedValue({ ok: true, cart: serverCart });

    const pending = store.getState().setQuantity("item-1", 3);
    expect(store.getState().cart.itemsCount).toBe(3);
    expect(store.getState().cart.totalCents).toBe(3000);

    await pending;
    expect(store.getState().cart).toEqual(serverCart);
    expect(store.getState().pending).toBe(false);
  });

  it("rolls back on failed update", async () => {
    const initial = sampleCart();
    const store = createCartStore(initial);
    mockedUpdate.mockResolvedValue({ ok: false, message: "Нет на складе" });

    const message = await store.getState().setQuantity("item-1", 9);
    expect(message).toBe("Нет на складе");
    expect(store.getState().cart).toEqual(initial);
    expect(store.getState().error).toBe("Нет на складе");
  });

  it("setCart overwrites state from server", () => {
    const store = createCartStore(sampleCart());
    const next = sampleCart({ items: [], totalCents: 0, itemsCount: 0 });
    store.getState().setCart(next);
    expect(store.getState().cart.itemsCount).toBe(0);
  });

  it("clears cart optimistically", async () => {
    const store = createCartStore(sampleCart());
    mockedClear.mockResolvedValue({
      ok: true,
      cart: { id: "cart-1", items: [], totalCents: 0, itemsCount: 0 },
    });

    const pending = store.getState().clear();
    expect(store.getState().cart.itemsCount).toBe(0);
    await pending;
    expect(mockedClear).toHaveBeenCalled();
  });

  it("adds item via server response", async () => {
    const store = createCartStore(sampleCart({ items: [], totalCents: 0, itemsCount: 0 }));
    const next = sampleCart();
    mockedAdd.mockResolvedValue({ ok: true, cart: next });

    const message = await store.getState().add("prod-1", 1);
    expect(message).toBeNull();
    expect(store.getState().cart.itemsCount).toBe(2);
  });

  it("rolls back remove on failure", async () => {
    const initial = sampleCart();
    const store = createCartStore(initial);
    mockedRemove.mockResolvedValue({ ok: false, message: "Ошибка" });

    const message = await store.getState().remove("item-1");
    expect(message).toBe("Ошибка");
    expect(store.getState().cart.items).toHaveLength(1);
  });
});
