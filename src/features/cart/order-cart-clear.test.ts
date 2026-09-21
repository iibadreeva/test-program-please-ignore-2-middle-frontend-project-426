import { beforeEach, describe, expect, it } from "vitest";
import {
  claimCartClearForOrder,
  markCartClearedForOrder,
  wasCartClearedForOrder,
} from "@/features/cart/order-cart-clear";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    key: (index) => [...map.keys()][index] ?? null,
  };
}

describe("claimCartClearForOrder", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("returns true only on the first claim for an orderId", () => {
    expect(claimCartClearForOrder("order-1", storage)).toBe(true);
    expect(claimCartClearForOrder("order-1", storage)).toBe(false);
    expect(claimCartClearForOrder("order-1", storage)).toBe(false);
  });

  it("tracks different orderIds independently", () => {
    expect(claimCartClearForOrder("order-a", storage)).toBe(true);
    expect(claimCartClearForOrder("order-b", storage)).toBe(true);
    expect(claimCartClearForOrder("order-a", storage)).toBe(false);
  });

  it("respects a prior markCartClearedForOrder", () => {
    markCartClearedForOrder("order-1", storage);
    expect(wasCartClearedForOrder("order-1", storage)).toBe(true);
    expect(claimCartClearForOrder("order-1", storage)).toBe(false);
  });
});
