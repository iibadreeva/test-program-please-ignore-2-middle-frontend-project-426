import Link from "next/link";
import type { ReactNode } from "react";
import type { UseCartMergedResult } from "@/features/cart/use-cart-merged";
import { routes } from "@/shared/routes";

export function CheckoutLoading() {
  return (
    <p className="border-border bg-surface text-muted border p-6" data-testid="checkout-loading">
      Загружаем корзину…
    </p>
  );
}

function CheckoutCatalogError({ message }: { message: string }) {
  return (
    <p
      className="border-border bg-surface text-danger border p-6"
      data-testid="checkout-catalog-error"
      role="alert"
    >
      {message}
    </p>
  );
}

function CheckoutPlacing() {
  return (
    <p className="border-border bg-surface text-muted border p-6" data-testid="checkout-placing">
      Оформляем заказ…
    </p>
  );
}

function CheckoutEmpty() {
  return (
    <div className="space-y-4">
      <p className="border-border bg-surface text-muted border p-6" data-testid="checkout-empty">
        Корзина пуста. Добавьте товары, чтобы оформить заказ.
      </p>
      <Link href={routes.catalog} className="text-accent inline-block hover:underline">
        В каталог
      </Link>
    </div>
  );
}

/** Состояния до формы: загрузка, ошибка каталога, пустая корзина, «оформляем». */
export function checkoutPreflight(
  cart: Pick<UseCartMergedResult, "hydrated" | "refs" | "error" | "pending">,
  placing: boolean,
): ReactNode | null {
  const { hydrated, refs, error, pending: catalogPending } = cart;

  if (!hydrated || (catalogPending && !placing)) return <CheckoutLoading />;
  if (error && !placing) return <CheckoutCatalogError message={error} />;
  // Корзину чистим в начале submit — показываем «оформляем», а не мигание «пусто».
  if (refs.length === 0 && placing) return <CheckoutPlacing />;
  if (refs.length === 0) return <CheckoutEmpty />;
  return null;
}
