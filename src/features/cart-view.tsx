"use client";

import Link from "next/link";
import { useCartMerged } from "@/features/cart/use-cart-merged";
import { useCartStore } from "@/features/cart/store";
import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/shared/format";

export function CartView() {
  const { hydrated, refs, merged, status, error, pending } = useCartMerged();
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  if (!hydrated || pending) {
    return (
      <div className="border border-border bg-surface p-8 text-muted" data-testid="cart-loading">
        Загружаем корзину…
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border bg-surface p-8 text-danger" data-testid="cart-error" role="alert">
        {error}
      </div>
    );
  }

  // Недоступные refs убирает clamp в useCartMerged; после готовности каталога считаем пустой.
  if (refs.length === 0 || (status === "ready" && merged.lines.length === 0)) {
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
    <div className="space-y-6" aria-busy={status === "loading"}>
      <ul className="space-y-4" data-testid="cart-items">
        {merged.lines.map((item) => (
          <li
            key={item.productId}
            className="grid gap-4 border border-border bg-surface p-4 sm:grid-cols-[96px_1fr_auto]"
            data-testid="cart-item"
          >
            <ProductImage
              src={item.product.imageUrl}
              alt={item.product.title}
              className="aspect-square w-24"
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
                {formatPrice(item.product.price)}
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
                        setQuantity(item.productId, Math.min(value, item.product.stock));
                      }
                    }}
                    className="ml-2 w-20 border border-border bg-bg px-2 py-1 font-mono text-text"
                    data-testid="cart-item-qty"
                  />
                </label>
                <button
                  type="button"
                  className="text-sm text-danger hover:underline"
                  data-testid="cart-item-remove"
                  onClick={() => remove(item.productId)}
                >
                  Удалить
                </button>
              </div>
            </div>
            <p className="font-mono text-right text-text" data-testid="cart-item-line-total">
              {formatPrice(item.lineTotal)}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <button
          type="button"
          className="text-sm text-muted hover:text-danger"
          data-testid="cart-clear"
          onClick={() => clear()}
        >
          Очистить корзину
        </button>
        <div className="text-right">
          <p className="text-sm text-muted">Итого</p>
          <p className="font-mono text-2xl text-accent" data-testid="cart-total">
            {formatPrice(merged.total)}
          </p>
          <Link
            href="/checkout"
            className="mt-3 inline-block bg-accent px-5 py-2.5 font-medium text-bg hover:bg-accent-dim"
            data-testid="cart-checkout"
          >
            Оформить заказ
          </Link>
        </div>
      </div>
    </div>
  );
}
