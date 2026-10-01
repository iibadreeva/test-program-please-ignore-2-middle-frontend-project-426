import { beforeEach, describe, expect, it } from "vitest";
import { CART_STORAGE_KEY } from "@/features/cart/cart-items";
import { useCartStore } from "@/features/cart/store";

describe("cart store persist", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ refs: [], hydrated: true });
  });

  it("writes refs to localStorage and restores them", async () => {
    useCartStore.getState().add("prod-1", 2);
    useCartStore.getState().add("prod-2", 1);

    const raw = localStorage.getItem(CART_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).state.refs).toEqual([
      { productId: "prod-1", quantity: 2 },
      { productId: "prod-2", quantity: 1 },
    ]);

    // Имитация перезагрузки: обнуляем память, восстанавливаем снимок, который setState перезаписал бы.
    useCartStore.setState({ refs: [] });
    localStorage.setItem(CART_STORAGE_KEY, raw!);
    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().refs).toEqual([
      { productId: "prod-1", quantity: 2 },
      { productId: "prod-2", quantity: 1 },
    ]);
  });

  it("does not add when cleared", () => {
    useCartStore.getState().add("prod-1", 1);
    useCartStore.getState().clear();
    expect(useCartStore.getState().refs).toEqual([]);
  });
});
