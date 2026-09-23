/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import {
  CHECKOUT_CART_PENDING_KEY,
  clearCheckoutCartSnapshot,
  markCheckoutCartPlaced,
  readCheckoutCartSnapshot,
  readCheckoutPending,
  resolvePendingCheckoutRestore,
  saveCheckoutCartSnapshot,
  takeCheckoutCartSnapshot,
} from "@/features/cart/checkout-cart-snapshot";

describe("checkout-cart-snapshot", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and reads refs from localStorage as inflight", () => {
    const refs = [
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 1 },
    ];
    saveCheckoutCartSnapshot(refs);
    expect(localStorage.getItem(CHECKOUT_CART_PENDING_KEY)).toBeTruthy();
    expect(readCheckoutCartSnapshot()).toEqual(refs);
    expect(readCheckoutPending()).toEqual({ refs, status: "inflight" });
  });

  it("take removes the pending snapshot after read", () => {
    saveCheckoutCartSnapshot([{ productId: "a", quantity: 1 }]);
    expect(takeCheckoutCartSnapshot()).toEqual([{ productId: "a", quantity: 1 }]);
    expect(takeCheckoutCartSnapshot()).toBeNull();
    expect(localStorage.getItem(CHECKOUT_CART_PENDING_KEY)).toBeNull();
  });

  it("clear drops pending without returning it", () => {
    saveCheckoutCartSnapshot([{ productId: "a", quantity: 1 }]);
    clearCheckoutCartSnapshot();
    expect(readCheckoutCartSnapshot()).toBeNull();
  });

  it("ignores corrupt pending payload", () => {
    localStorage.setItem(CHECKOUT_CART_PENDING_KEY, "{not-json");
    expect(readCheckoutCartSnapshot()).toBeNull();
    localStorage.setItem(CHECKOUT_CART_PENDING_KEY, JSON.stringify({ refs: "nope" }));
    expect(readCheckoutCartSnapshot()).toBeNull();
  });

  it("treats legacy payload without status as inflight", () => {
    localStorage.setItem(
      CHECKOUT_CART_PENDING_KEY,
      JSON.stringify({ refs: [{ productId: "a", quantity: 1 }] }),
    );
    expect(readCheckoutPending()?.status).toBe("inflight");
    expect(resolvePendingCheckoutRestore("/catalog", [])).toEqual([
      { productId: "a", quantity: 1 },
    ]);
  });

  it("restores pending when cart is empty after tab close (inflight)", () => {
    saveCheckoutCartSnapshot([{ productId: "a", quantity: 2 }]);
    expect(resolvePendingCheckoutRestore("/catalog", [])).toEqual([
      { productId: "a", quantity: 2 },
    ]);
    expect(readCheckoutCartSnapshot()).toBeNull();
  });

  it("does not restore after order was placed (tab closed before success page)", () => {
    saveCheckoutCartSnapshot([{ productId: "a", quantity: 1 }]);
    markCheckoutCartPlaced();
    expect(readCheckoutPending()?.status).toBe("placed");
    expect(resolvePendingCheckoutRestore("/catalog", [])).toBeNull();
    expect(readCheckoutCartSnapshot()).toBeNull();
    expect(localStorage.getItem(CHECKOUT_CART_PENDING_KEY)).toBeNull();
  });

  it("take does not restore placed pending", () => {
    saveCheckoutCartSnapshot([{ productId: "a", quantity: 1 }]);
    markCheckoutCartPlaced();
    expect(takeCheckoutCartSnapshot()).toBeNull();
    expect(localStorage.getItem(CHECKOUT_CART_PENDING_KEY)).toBeNull();
  });

  it("drops pending on success page without restoring", () => {
    saveCheckoutCartSnapshot([{ productId: "a", quantity: 1 }]);
    markCheckoutCartPlaced();
    expect(resolvePendingCheckoutRestore("/checkout/success", [])).toBeNull();
    expect(readCheckoutCartSnapshot()).toBeNull();
  });

  it("drops stale pending when cart already has items", () => {
    saveCheckoutCartSnapshot([{ productId: "a", quantity: 1 }]);
    expect(
      resolvePendingCheckoutRestore("/checkout", [{ productId: "b", quantity: 1 }]),
    ).toBeNull();
    expect(readCheckoutCartSnapshot()).toBeNull();
  });
});
