"use client";

import Link from "next/link";
import {
  useCartError,
  useCartItems,
  useCartPending,
  useCartStore,
  useCartTotalCents,
} from "@/features/cart/store-provider";
import { formatPrice } from "@/shared/format";

export function CartView() {
  const items = useCartItems();
  const totalCents = useCartTotalCents();
  const pending = useCartPending();
  const error = useCartError();
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  if (items.length === 0) {
    return (
      <div className="border border-border bg-surface p-8" data-testid="cart-empty">
        <p className="text-muted">Корзина пуста.</p>
        <Link href="/catalog" className="mt-4 inline-block text-accent hover:underline">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-busy={pending}>
      {error ? (
        <p className="text-sm text-danger" role="alert" data-testid="cart-error">
          {error}
        </p>
      ) : null}

      <ul className="space-y-4" data-testid="cart-items">
        {items.map((item) => (
          <li
            key={item.id}
            className="grid gap-4 border border-border bg-surface p-4 sm:grid-cols-[96px_1fr_auto]"
            data-testid="cart-item"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.product.imageUrl}
              alt=""
              className="aspect-square w-24 object-cover bg-surface-2"
            />
            <div>
              <Link
                href={`/products/${item.product.slug}`}
                className="font-display font-medium hover:text-accent"
                data-testid="cart-item-title"
              >
                {item.product.title}
              </Link>
              <p className="mt-1 font-mono text-sm text-accent">
                {formatPrice(item.product.priceCents)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-sm text-muted">
                  Кол-во
                  <input
                    type="number"
                    min={1}
                    max={item.product.stock}
                    value={item.quantity}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isInteger(value) && value >= 1) {
                        void setQuantity(item.id, value);
                      }
                    }}
                    className="ml-2 w-20 border border-border bg-bg px-2 py-1 font-mono text-text"
                    data-testid="cart-item-quantity"
                    disabled={pending}
                  />
                </label>
                <button
                  type="button"
                  className="text-sm text-danger hover:underline"
                  data-testid="cart-item-remove"
                  onClick={() => void remove(item.id)}
                  disabled={pending}
                >
                  Удалить
                </button>
              </div>
            </div>
            <p className="font-mono text-right text-text" data-testid="cart-item-line-total">
              {formatPrice(item.product.priceCents * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <button
          type="button"
          className="text-sm text-muted hover:text-danger"
          data-testid="cart-clear"
          onClick={() => void clear()}
          disabled={pending}
        >
          Очистить корзину
        </button>
        <div className="text-right">
          <p className="text-sm text-muted">Итого</p>
          <p className="font-mono text-2xl text-accent" data-testid="cart-total">
            {formatPrice(totalCents)}
          </p>
          <Link
            href="/checkout"
            className="mt-3 inline-block bg-accent px-5 py-2.5 font-medium text-bg hover:bg-accent-dim"
            data-testid="cart-checkout-link"
          >
            Оформить заказ
          </Link>
        </div>
      </div>
    </div>
  );
}
