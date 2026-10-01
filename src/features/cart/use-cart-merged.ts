"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

function useCartCatalogProducts(
  enabled: boolean,
  hydrated: boolean,
  idsKey: string,
  /** Смена ключа (visibility / фоновый clamp) — принудительный refetch при тех же ids. */
  refreshKey: number,
) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [status, setStatus] = useState<CartCatalogStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  /** idsKey, для которого status/products уже согласованы (иначе clamp видит stale ready). */
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const requestId = useRef(0);

  // До paint: сбросить stale ready, иначе hydrator one-shot сразу снимет bgPending.
  // Инварианты (см. cart-hydrator + тесты):
  // 1) enabled→false: requestId++, status idle — late then не даёт ready и не снимает bgPending.
  // 2) refreshKey/idsKey: layout ставит loading до paint, effect стартует fetch.
  // 3) resolvedKey === idsKey обязателен для clamp — иначе пустой ready обнуляет новые refs.
  useLayoutEffect(() => {
    if (!enabled || !hydrated) {
      // Выключение fetch (shell / пауза): инвалидируем in-flight и idle —
      // иначе late then вернёт ready и hydrator снимет bgPending до refetch.
      if (!enabled) {
        requestId.current += 1;
        setStatus("idle");
        setResolvedKey(null);
        setError(null);
      }
      return;
    }

    const ids = idsKey.length > 0 ? idsKey.split(",") : [];
    if (ids.length === 0) {
      setProducts([]);
      setStatus("ready");
      setResolvedKey("");
      setError(null);
      return;
    }

    setStatus("loading");
    setError(null);
  }, [enabled, hydrated, idsKey, refreshKey]);

  useEffect(() => {
    if (!enabled || !hydrated) return;

    const ids = idsKey.length > 0 ? idsKey.split(",") : [];
    if (ids.length === 0) return;

    const currentRequest = ++requestId.current;

    void loadCartCatalog(ids)
      .then((next) => {
        if (currentRequest !== requestId.current) return;
        setProducts(next);
        setStatus("ready");
        setResolvedKey(idsKey);
      })
      .catch(() => {
        if (currentRequest !== requestId.current) return;
        setProducts([]);
        setStatus("error");
        setResolvedKey(idsKey);
        setError("Не удалось загрузить корзину. Попробуйте обновить страницу.");
      });
  }, [enabled, hydrated, idsKey, refreshKey]);

  return { products, status, error, resolvedKey };
}

function useSyncClampedRefs(
  status: CartCatalogStatus,
  refs: ReturnType<typeof useCartRefs>,
  products: ProductSummary[],
  idsKey: string,
  resolvedKey: string | null,
) {
  const replaceRefs = useCartStore((s) => s.replaceRefs);

  useEffect(() => {
    if (status !== "ready") return;
    // Пустая корзина → add: один кадр status ещё ready при products=[] (resolvedKey "").
    // Без этой проверки clamp мгновенно обнуляет только что добавленные refs.
    if (resolvedKey !== idsKey) return;
    const next = clampedRefs(refs, products);
    const changed =
      next.length !== refs.length ||
      next.some(
        (ref, index) =>
          ref.quantity !== refs[index]?.quantity || ref.productId !== refs[index]?.productId,
      );
    if (changed) replaceRefs(next);
  }, [status, products, refs, replaceRefs, idsKey, resolvedKey]);
}

/**
 * Загружает строки каталога для refs из localStorage с защитой от гонок,
 * синхронизацией клампа остатка в store и явными состояниями loading/error.
 * На оформлении передайте syncClamped: false, чтобы недоступные позиции дожили до сервера.
 * fetchCatalog: false — не бить server action (layout/hydrator вне cart/checkout).
 * refreshKey — принудительный refetch (фоновый clamp / visibility).
 */
export function useCartMerged(options?: {
  syncClamped?: boolean;
  fetchCatalog?: boolean;
  refreshKey?: number;
}): UseCartMergedResult {
  const syncClamped = options?.syncClamped !== false;
  const fetchCatalog = options?.fetchCatalog !== false;
  const refreshKey = options?.refreshKey ?? 0;
  const hydrated = useCartHydrated();
  const refs = useCartRefs();
  const idsKey = refs.map((ref) => ref.productId).join(",");
  const { products, status, error, resolvedKey } = useCartCatalogProducts(
    fetchCatalog,
    hydrated,
    idsKey,
    refreshKey,
  );
  useSyncClampedRefs(
    syncClamped && fetchCatalog ? status : "idle",
    refs,
    products,
    idsKey,
    syncClamped && fetchCatalog ? resolvedKey : idsKey,
  );

  const merged = useMemo(() => mergeWithProducts(refs, products), [refs, products]);

  return {
    hydrated,
    refs,
    merged,
    status: fetchCatalog ? status : "idle",
    error: fetchCatalog ? error : null,
    pending:
      fetchCatalog &&
      (!hydrated || (refs.length > 0 && (status === "loading" || status === "idle"))),
  };
}
