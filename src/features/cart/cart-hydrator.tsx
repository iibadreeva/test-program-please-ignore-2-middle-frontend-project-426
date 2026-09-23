"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { resolvePendingCheckoutRestore } from "@/features/cart/checkout-cart-snapshot";
import { CART_STORAGE_KEY } from "@/features/cart/cart-items";
import { useCartMerged } from "@/features/cart/use-cart-merged";
import { useCartStore } from "@/features/cart/store";

/** После монтирования регидратируем persist-store, чтобы не было рассинхрона SSR/клиента. */
export function CartHydrator() {
  const pathname = usePathname();
  // На оформлении не вычищаем недоступные refs — их должен отклонить сервер.
  const syncClamped = !pathname.startsWith("/checkout");

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

  // Подтягиваем каталог и клампим остаток в localStorage, чтобы бейдж совпадал с доступным.
  useCartMerged({ syncClamped });

  return null;
}
