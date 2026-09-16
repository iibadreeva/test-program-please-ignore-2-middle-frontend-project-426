import { createStore, type StoreApi } from "zustand/vanilla";
import {
  addToCartAction,
  clearCartAction,
  removeCartItemAction,
  updateCartItemAction,
} from "@/features/cart-actions";
import type { SerializedCart } from "@/server/services/cart";

export type CartStoreState = {
  cart: SerializedCart;
  pending: boolean;
  error: string | null;
  setCart: (cart: SerializedCart) => void;
  add: (productId: string, quantity?: number) => Promise<string | null>;
  setQuantity: (itemId: string, quantity: number) => Promise<string | null>;
  remove: (itemId: string) => Promise<string | null>;
  clear: () => Promise<string | null>;
};

function emptyCart(): SerializedCart {
  return { id: "empty", items: [], totalCents: 0, itemsCount: 0 };
}

function withTotals(items: SerializedCart["items"], id: string): SerializedCart {
  return {
    id,
    items,
    totalCents: items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0),
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export type CartStoreApi = StoreApi<CartStoreState>;

export function createCartStore(initialCart?: SerializedCart | null): CartStoreApi {
  return createStore<CartStoreState>()((set, get) => ({
    cart: initialCart ?? emptyCart(),
    pending: false,
    error: null,

    setCart(cart) {
      set({ cart, error: null });
    },

    async add(productId, quantity = 1) {
      const snapshot = get().cart;
      set({ pending: true, error: null });

      const result = await addToCartAction(productId, quantity);
      if (!result.ok) {
        set({ cart: snapshot, pending: false, error: result.message });
        return result.message;
      }

      set({ cart: result.cart, pending: false, error: null });
      return null;
    },

    async setQuantity(itemId, quantity) {
      const snapshot = get().cart;
      const optimisticItems = snapshot.items
        .map((item) => (item.id === itemId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0);

      set({
        cart: withTotals(optimisticItems, snapshot.id),
        pending: true,
        error: null,
      });

      const result = await updateCartItemAction(itemId, quantity);
      if (!result.ok) {
        set({ cart: snapshot, pending: false, error: result.message });
        return result.message;
      }

      set({ cart: result.cart, pending: false, error: null });
      return null;
    },

    async remove(itemId) {
      const snapshot = get().cart;
      const optimisticItems = snapshot.items.filter((item) => item.id !== itemId);

      set({
        cart: withTotals(optimisticItems, snapshot.id),
        pending: true,
        error: null,
      });

      const result = await removeCartItemAction(itemId);
      if (!result.ok) {
        set({ cart: snapshot, pending: false, error: result.message });
        return result.message;
      }

      set({ cart: result.cart, pending: false, error: null });
      return null;
    },

    async clear() {
      const snapshot = get().cart;
      set({
        cart: withTotals([], snapshot.id),
        pending: true,
        error: null,
      });

      const result = await clearCartAction();
      if (!result.ok) {
        set({ cart: snapshot, pending: false, error: result.message });
        return result.message;
      }

      set({ cart: result.cart, pending: false, error: null });
      return null;
    },
  }));
}
