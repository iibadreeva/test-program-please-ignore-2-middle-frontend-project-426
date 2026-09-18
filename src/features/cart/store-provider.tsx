"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createCartStore,
  type CartStoreApi,
  type CartStoreState,
} from "@/features/cart/store";
import type { SerializedCart } from "@/server/services/cart";

const CartStoreContext = createContext<CartStoreApi | null>(null);

type Props = {
  initialCart: SerializedCart;
  children: ReactNode;
};

export function CartStoreProvider({ initialCart, children }: Props) {
  const storeRef = useRef<CartStoreApi | null>(null);

  if (!storeRef.current) {
    storeRef.current = createCartStore(initialCart);
  }

  useEffect(() => {
    storeRef.current?.getState().setCart(initialCart);
  }, [initialCart]);

  return (
    <CartStoreContext.Provider value={storeRef.current}>{children}</CartStoreContext.Provider>
  );
}

export function useCartStore<T>(selector: (state: CartStoreState) => T): T {
  const store = useContext(CartStoreContext);
  if (!store) {
    throw new Error("useCartStore must be used within CartStoreProvider");
  }
  return useStore(store, selector);
}

export function useCartItemsCount() {
  return useCartStore((s) => s.cart.itemsCount);
}

export function useCartItems() {
  return useCartStore((s) => s.cart.items);
}

export function useCartTotal() {
  return useCartStore((s) => s.cart.total);
}

export function useCartPending() {
  return useCartStore((s) => s.pending);
}

export function useCartError() {
  return useCartStore((s) => s.error);
}
