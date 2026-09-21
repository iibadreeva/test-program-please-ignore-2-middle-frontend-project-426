"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadCartCatalog } from "@/features/cart/cart-catalog";
import { clampedRefs, mergeWithProducts, type MergedCart } from "@/features/cart/cart-items";
import { useCartHydrated, useCartRefs, useCartStore } from "@/features/cart/store";
import type { ProductSummary } from "@/shared/api-contract";

export type CartCatalogStatus = "idle" | "loading" | "ready" | "error";

export type UseCartMergedResult = {
  hydrated: boolean;
  refs: ReturnType<typeof useCartRefs>;
  merged: MergedCart;
  status: CartCatalogStatus;
  error: string | null;
  pending: boolean;
};

function useCartCatalogProducts(hydrated: boolean, idsKey: string) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [status, setStatus] = useState<CartCatalogStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!hydrated) return;

    const ids = idsKey.length > 0 ? idsKey.split(",") : [];
    if (ids.length === 0) {
      setProducts([]);
      setStatus("ready");
      setError(null);
      return;
    }

    const currentRequest = ++requestId.current;
    setStatus("loading");
    setError(null);

    void loadCartCatalog(ids)
      .then((next) => {
        if (currentRequest !== requestId.current) return;
        setProducts(next);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (currentRequest !== requestId.current) return;
        console.error(err);
        setProducts([]);
        setStatus("error");
        setError("Не удалось загрузить корзину. Попробуйте обновить страницу.");
      });
  }, [hydrated, idsKey]);

  return { products, status, error };
}

function useSyncClampedRefs(
  status: CartCatalogStatus,
  refs: ReturnType<typeof useCartRefs>,
  products: ProductSummary[],
) {
  const replaceRefs = useCartStore((s) => s.replaceRefs);

  useEffect(() => {
    if (status !== "ready") return;
    const next = clampedRefs(refs, products);
    const changed =
      next.length !== refs.length ||
      next.some(
        (ref, index) =>
          ref.quantity !== refs[index]?.quantity || ref.productId !== refs[index]?.productId,
      );
    if (changed) replaceRefs(next);
  }, [status, products, refs, replaceRefs]);
}

/**
 * Загружает строки каталога для refs из localStorage с защитой от гонок,
 * синхронизацией клампа остатка в store и явными состояниями loading/error.
 */
export function useCartMerged(): UseCartMergedResult {
  const hydrated = useCartHydrated();
  const refs = useCartRefs();
  const idsKey = refs.map((ref) => ref.productId).join(",");
  const { products, status, error } = useCartCatalogProducts(hydrated, idsKey);
  useSyncClampedRefs(status, refs, products);

  const merged = useMemo(() => mergeWithProducts(refs, products), [refs, products]);

  return {
    hydrated,
    refs,
    merged,
    status,
    error,
    pending: !hydrated || (refs.length > 0 && (status === "loading" || status === "idle")),
  };
}
