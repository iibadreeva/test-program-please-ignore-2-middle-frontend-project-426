"use client";

import { getCartProducts } from "@/features/cart/actions";
import type { ProductSummary } from "@/shared/api-contract";

type Inflight = {
  key: string;
  promise: Promise<ProductSummary[]>;
};

let inflight: Inflight | null = null;

/** Общий запрос каталога: CartHydrator и CartView/Checkout делят один inflight-запрос. */
export function loadCartCatalog(ids: string[]): Promise<ProductSummary[]> {
  const key = ids.join(",");
  if (inflight && inflight.key === key) {
    return inflight.promise;
  }

  const promise = getCartProducts(ids).finally(() => {
    if (inflight?.promise === promise) {
      inflight = null;
    }
  });

  inflight = { key, promise };
  return promise;
}

/** Только для тестов: сбросить inflight-дедуп между кейсами. */
export function __resetCartCatalogForTests() {
  inflight = null;
}
