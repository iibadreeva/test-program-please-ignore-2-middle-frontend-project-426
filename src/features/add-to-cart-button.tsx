"use client";

import { useState } from "react";
import { useCartPending, useCartStore } from "@/features/cart/store-provider";

type Props = {
  productId: string;
  disabled?: boolean;
};

export function AddToCartButton({ productId, disabled }: Props) {
  const pending = useCartPending();
  const add = useCartStore((s) => s.add);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setDone(false);
    setError(null);
    const message = await add(productId, 1);
    if (message) {
      setError(message);
      return;
    }
    setDone(true);
  }

  return (
    <div>
      <button
        type="button"
        className="mt-8 bg-accent px-5 py-2.5 font-medium text-bg transition hover:bg-accent-dim disabled:opacity-40"
        data-testid="add-to-cart-button"
        disabled={disabled || pending}
        onClick={() => void onClick()}
      >
        {pending ? "Добавляем…" : disabled ? "Нет в наличии" : "В корзину"}
      </button>
      {done ? (
        <p className="mt-2 text-sm text-accent" data-testid="add-to-cart-success">
          Добавлено в корзину
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-danger" data-testid="add-to-cart-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
