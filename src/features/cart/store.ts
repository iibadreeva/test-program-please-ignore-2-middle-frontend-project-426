"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  addRef,
  CART_STORAGE_KEY,
  normalizeRefs,
  removeRef,
  setRefQuantity,
  type CartRef,
} from "@/features/cart/cart-items";

type CartStoreState = {
  refs: CartRef[];
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  replaceRefs: (refs: CartRef[]) => void;
};

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      refs: [],
      hydrated: false,

      setHydrated(value) {
        set({ hydrated: value });
      },

      add(productId, quantity = 1) {
        set({ refs: addRef(get().refs, productId, quantity) });
      },

      setQuantity(productId, quantity) {
        set({ refs: setRefQuantity(get().refs, productId, quantity) });
      },

      remove(productId) {
        set({ refs: removeRef(get().refs, productId) });
      },

      clear() {
        set({ refs: [] });
      },

      replaceRefs(next) {
        set({ refs: normalizeRefs(next) });
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ refs: state.refs }),
      merge: (persisted, current) => {
        const raw =
          typeof persisted === "object" && persisted !== null && "refs" in persisted
            ? (persisted as { refs: unknown }).refs
            : [];
        return {
          ...current,
          refs: normalizeRefs(raw),
        };
      },
    },
  ),
);

export function useCartRefs() {
  return useCartStore((s) => s.refs);
}

export function useCartHydrated() {
  return useCartStore((s) => s.hydrated);
}

export function useCartItemsCount() {
  return useCartStore((s) => s.refs.reduce((sum, ref) => sum + ref.quantity, 0));
}
