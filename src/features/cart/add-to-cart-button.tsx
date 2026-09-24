"use client";

import { useState } from "react";
import { useCartHydrated, useCartStore } from "@/features/cart/store";

type Props = {
  productId: string;
  available: boolean;
};

export function AddToCartButton({ productId, available }: Props) {
  const add = useCartStore((s) => s.add);
  const hydrated = useCartHydrated();
  const [done, setDone] = useState(false);

  // До rehydrate add затрётся пустым localStorage — не даём кликнуть раньше времени.
  const canAdd = available && hydrated;

  function onClick() {
    if (!canAdd) return;
    add(productId, 1);
    setDone(true);
  }

  return (
    <div>
      <button
        type="button"
        className="mt-8 bg-accent px-5 py-2.5 font-medium text-bg transition hover:bg-accent-dim disabled:opacity-40"
        data-testid="product-add-to-cart"
        disabled={!canAdd}
        onClick={onClick}
      >
        {available ? "В корзину" : "Нет в наличии"}
      </button>
      {done ? (
        <p className="mt-2 text-sm text-accent" data-testid="add-to-cart-success">
          Добавлено в корзину
        </p>
      ) : null}
    </div>
  );
}
