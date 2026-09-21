"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markCartClearedForOrder } from "@/features/cart/order-cart-clear";
import { useCartMerged } from "@/features/cart/use-cart-merged";
import { useCartStore } from "@/features/cart/store";
import { checkoutAction, type CheckoutFormState } from "@/features/checkout-actions";
import { formatPrice } from "@/shared/format";
import { fromMoney } from "@/shared/money";

type PickupPoint = { id: string; name: string; address: string };

type Props = {
  pickupPoints: PickupPoint[];
  defaultName?: string;
};

const initial: CheckoutFormState = { ok: false };

/**
 * Очищает localStorage-корзину в момент submit (при ошибке откатываем snapshot),
 * чтобы вторая вкладка / двойной клик реже создавали дубль заказа.
 */
async function checkoutFormAction(
  prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const snapshot = useCartStore.getState().refs;
  useCartStore.getState().clear();

  const result = await checkoutAction(prev, formData);
  if (!result.ok) {
    useCartStore.getState().replaceRefs(snapshot);
    return result;
  }

  if (result.orderId) {
    markCartClearedForOrder(result.orderId);
  }
  return result;
}

export function CheckoutForm({ pickupPoints, defaultName = "" }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(checkoutFormAction, initial);
  const [deliveryType, setDeliveryType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const { hydrated, merged, error, pending: catalogPending } = useCartMerged();

  useEffect(() => {
    if (!state.ok || !state.orderId) return;
    router.replace(`/account/orders/${state.orderId}?placed=1`);
  }, [state.ok, state.orderId, router]);

  const placing = pending || Boolean(state.ok && state.orderId);

  const orderItemsJson = JSON.stringify(
    merged.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  );

  if (!hydrated || (catalogPending && !placing)) {
    return (
      <p className="border border-border bg-surface p-6 text-muted" data-testid="checkout-loading">
        Загружаем корзину…
      </p>
    );
  }

  if (error && !placing) {
    return (
      <p className="border border-border bg-surface p-6 text-danger" data-testid="checkout-error" role="alert">
        {error}
      </p>
    );
  }

  // Корзину чистим в начале submit — показываем «оформляем», а не мигание «пусто».
  if (merged.lines.length === 0 && placing) {
    return (
      <p className="border border-border bg-surface p-6 text-muted" data-testid="checkout-placing">
        Оформляем заказ…
      </p>
    );
  }

  if (merged.lines.length === 0) {
    return (
      <div className="space-y-4">
        <p className="border border-border bg-surface p-6 text-muted" data-testid="checkout-empty">
          Корзина пуста. Добавьте товары, чтобы оформить заказ.
        </p>
        <Link href="/catalog" className="inline-block text-accent hover:underline">
          В каталог
        </Link>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="grid gap-8 lg:grid-cols-[1fr_320px]"
      data-testid="checkout-form"
      noValidate
    >
      <input type="hidden" name="items" value={orderItemsJson} />

      <div className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="font-display text-lg font-medium">Способ получения</legend>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 border border-border px-3 py-2 has-[:checked]:border-accent">
              <input
                type="radio"
                name="deliveryType"
                value="DELIVERY"
                checked={deliveryType === "DELIVERY"}
                onChange={() => setDeliveryType("DELIVERY")}
                data-testid="checkout-delivery-type-delivery"
              />
              Доставка
            </label>
            <label className="inline-flex items-center gap-2 border border-border px-3 py-2 has-[:checked]:border-accent">
              <input
                type="radio"
                name="deliveryType"
                value="PICKUP"
                checked={deliveryType === "PICKUP"}
                onChange={() => setDeliveryType("PICKUP")}
                data-testid="checkout-delivery-type-pickup"
              />
              Самовывоз
            </label>
          </div>
        </fieldset>

        {deliveryType === "DELIVERY" ? (
          <label className="block text-sm">
            <span className="text-muted">Адрес доставки</span>
            <textarea
              name="address"
              rows={3}
              className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
              placeholder="Город, улица, дом, квартира"
              data-testid="checkout-address"
            />
            {state.fieldErrors?.address?.[0] ? (
              <span className="mt-1 block text-xs text-danger">{state.fieldErrors.address[0]}</span>
            ) : null}
          </label>
        ) : (
          <label className="block text-sm">
            <span className="text-muted">Пункт самовывоза</span>
            <select
              name="pickupPointId"
              className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
              defaultValue=""
              data-testid="checkout-pickup-point"
            >
              <option value="" disabled>
                Выберите пункт
              </option>
              {pickupPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name} — {point.address}
                </option>
              ))}
            </select>
            {state.fieldErrors?.pickupPointId?.[0] ? (
              <span className="mt-1 block text-xs text-danger">
                {state.fieldErrors.pickupPointId[0]}
              </span>
            ) : null}
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted">Получатель</span>
            <input
              type="text"
              name="recipientName"
              defaultValue={defaultName}
              required
              className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
              data-testid="checkout-recipient-name"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Телефон</span>
            <input
              type="tel"
              name="phone"
              required
              placeholder="+7 999 000-00-00"
              className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
              data-testid="checkout-phone"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-muted">Комментарий</span>
          <textarea
            name="comment"
            rows={2}
            className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
            data-testid="checkout-comment"
          />
        </label>

        {state.message ? (
          <p className="text-sm text-danger" role="alert" data-testid="checkout-form-error">
            {state.message}
          </p>
        ) : null}
      </div>

      <aside className="h-fit border border-border bg-surface p-4" data-testid="checkout-summary">
        <h2 className="font-display text-lg font-medium">Ваш заказ</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {merged.lines.map((line) => (
            <li key={line.productId} className="flex justify-between gap-3">
              <span className="text-muted">
                {line.product.title} × {line.quantity}
              </span>
              <span className="font-mono">
                {formatPrice(fromMoney(line.product.price) * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-border pt-4 font-mono text-lg text-accent">
          <span>Итого</span>
          <span data-testid="checkout-total">{formatPrice(merged.total)}</span>
        </p>
        <button
          type="submit"
          disabled={pending || state.ok || merged.lines.length === 0}
          className="mt-4 w-full bg-accent px-5 py-2.5 font-medium text-bg hover:bg-accent-dim disabled:opacity-40"
          data-testid="checkout-submit"
        >
          {pending || state.ok ? "Оформляем…" : "Подтвердить заказ"}
        </button>
      </aside>
    </form>
  );
}
