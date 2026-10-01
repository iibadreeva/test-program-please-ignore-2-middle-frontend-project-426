"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { resolvePendingCheckoutRestore } from "@/features/cart/checkout-cart-snapshot";
import { CART_STORAGE_KEY } from "@/features/cart/cart-items";
import { useCartMerged } from "@/features/cart/use-cart-merged";
import { useCartHydrated, useCartRefs, useCartStore } from "@/features/cart/store";
import { matchesRoute, routes } from "@/shared/routes";

/**
 * После монтирования регидратируем persist-store.
 * На /cart и /checkout каталог грузит UI страницы — hydrator не дублирует fetch.
 * Вне shell: один фоновый clamp после появления/смены позиций (и при уходе со shell),
 * повтор при visibility. Триггер — idsKey (состав productId), не length:
 * иначе replaceRefs с тем же числом позиций не поднимет clamp.
 * bgPending сбрасываем на shell/пустой корзине —
 * иначе mid-fetch уход на /cart оставляет «залипший» pending.
 *
 * Инвариант с useCartMerged: bgPending снимается только на ready/error текущего
 * fetchCatalog; при выключении fetch хук обязан уйти в idle (не stale ready).
 */
export function CartHydrator() {
  const pathname = usePathname();
  const hydrated = useCartHydrated();
  const refs = useCartRefs();
  const onCart = matchesRoute(pathname, routes.cart);
  const onCheckoutForm = pathname === routes.checkout;
  /** CartView / CheckoutForm сами вызывают useCartMerged. */
  const shellOwnsCatalog = onCart || onCheckoutForm;
  /** Состав ids, не length: иначе replaceRefs с тем же числом позиций не поднимет clamp. */
  const idsKey = refs.map((ref) => ref.productId).join(",");
  const hasItems = hydrated && idsKey.length > 0;

  /** Эпоха фонового запроса: (re)вход вне shell и каждый visibility. */
  const [bgEpoch, setBgEpoch] = useState(0);
  /** true, пока ждём ready/error текущего фонового clamp. */
  const [bgPending, setBgPending] = useState(false);

  useEffect(() => {
    if (!hydrated || idsKey.length === 0) {
      setBgPending(false);
      return;
    }
    if (shellOwnsCatalog) {
      setBgPending(false);
      return;
    }

    // Новый epoch при каждом входе в «вне shell» / смене ids — иначе stale ready снимет pending до refetch.
    setBgEpoch((key) => key + 1);
    setBgPending(true);

    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      setBgEpoch((key) => key + 1);
      setBgPending(true);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [hydrated, idsKey, shellOwnsCatalog]);

  const fetchCatalog = bgPending && hasItems && !shellOwnsCatalog;
  const syncClamped = fetchCatalog;

  const { status } = useCartMerged({
    syncClamped,
    fetchCatalog,
    refreshKey: fetchCatalog ? bgEpoch : 0,
  });

  useEffect(() => {
    if (!bgPending) return;
    if (status === "ready" || status === "error") {
      setBgPending(false);
    }
  }, [status, bgPending]);

  useEffect(() => {
    const result = useCartStore.persist.rehydrate();
    void Promise.resolve(result).then(() => {
      const store = useCartStore.getState();
      // pathname из location: эффект один раз при монтировании layout.
      const restored = resolvePendingCheckoutRestore(
        window.location.pathname,
        store.refs,
      );
      if (restored) store.replaceRefs(restored);
      store.setHydrated(true);
    });
  }, []);

  // Другие вкладки пишут в тот же ключ localStorage — подхватываем очистку после оформления.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== CART_STORAGE_KEY && event.key !== null) return;
      void useCartStore.persist.rehydrate();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
