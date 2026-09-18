"use client";

import { useActionState, useState } from "react";
import { checkoutAction, type CheckoutFormState } from "@/features/checkout-actions";
import { formatPrice } from "@/shared/format";
import { fromMoney } from "@/shared/money";
import type { MoneyString } from "@/shared/api-contract";

type PickupPoint = { id: string; name: string; address: string };

type CartLine = {
  id: string;
  title: string;
  quantity: number;
  price: MoneyString;
};

type Props = {
  pickupPoints: PickupPoint[];
  cartLines: CartLine[];
  total: MoneyString;
  defaultName?: string;
};

const initial: CheckoutFormState = { ok: false };

export function CheckoutForm({ pickupPoints, cartLines, total, defaultName = "" }: Props) {
  const [state, action, pending] = useActionState(checkoutAction, initial);
  const [deliveryType, setDeliveryType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_320px]" data-testid="checkout-form" noValidate>
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
              <span className="mt-1 block text-xs text-danger">{state.fieldErrors.pickupPointId[0]}</span>
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
          <p className="text-sm text-danger" role="alert" data-testid="checkout-error">
            {state.message}
          </p>
        ) : null}
      </div>

      <aside className="h-fit border border-border bg-surface p-4" data-testid="checkout-summary">
        <h2 className="font-display text-lg font-medium">Ваш заказ</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {cartLines.map((line) => (
            <li key={line.id} className="flex justify-between gap-3">
              <span className="text-muted">
                {line.title} × {line.quantity}
              </span>
              <span className="font-mono">
                {formatPrice(fromMoney(line.price) * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-border pt-4 font-mono text-lg text-accent">
          <span>Итого</span>
          <span data-testid="checkout-total">{formatPrice(total)}</span>
        </p>
        <button
          type="submit"
          disabled={pending || cartLines.length === 0}
          className="mt-4 w-full bg-accent px-5 py-2.5 font-medium text-bg hover:bg-accent-dim disabled:opacity-40"
          data-testid="checkout-submit"
        >
          {pending ? "Оформляем…" : "Подтвердить заказ"}
        </button>
      </aside>
    </form>
  );
}
