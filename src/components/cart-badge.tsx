"use client";

import { useCartItemsCount } from "@/features/cart/store-provider";

export function CartBadge() {
  const itemsCount = useCartItemsCount();

  if (itemsCount <= 0) return null;

  return (
    <span
      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-accent px-1 font-mono text-xs text-bg"
      data-testid="cart-count"
    >
      {itemsCount > 99 ? "99+" : itemsCount}
    </span>
  );
}
