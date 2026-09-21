"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { claimCartClearForOrder } from "@/features/cart/order-cart-clear";
import { useCartStore } from "@/features/cart/store";

type Props = {
  orderId: string;
  placed: boolean;
};

/**
 * После оформления (?placed=1): очищаем корзину не больше одного раза на orderId,
 * затем убираем query — повторный заход по success-URL не сотрёт уже новую корзину.
 */
export function ClearCartOnPlaced({ orderId, placed }: Props) {
  const router = useRouter();
  const [showBanner, setShowBanner] = useState(placed);

  useEffect(() => {
    if (!placed) return;

    if (claimCartClearForOrder(orderId)) {
      useCartStore.getState().clear();
    }

    setShowBanner(true);
    router.replace(`/account/orders/${orderId}`, { scroll: false });
  }, [placed, orderId, router]);

  if (!showBanner) return null;

  return (
    <p
      className="border border-accent/40 bg-surface px-4 py-3 text-sm text-accent"
      data-testid="order-placed-banner"
    >
      Заказ оформлен. Спасибо!
    </p>
  );
}
