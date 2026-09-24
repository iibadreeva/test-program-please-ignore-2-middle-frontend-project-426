"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  clearCheckoutCartSnapshot,
  markCheckoutCartPlaced,
  saveCheckoutCartSnapshot,
} from "@/features/cart/checkout-cart-snapshot";
import { useCartMerged, type UseCartMergedResult } from "@/features/cart/use-cart-merged";
import { useCartStore } from "@/features/cart/store";
import { checkoutAction, type CheckoutFormState } from "@/features/checkout/actions";
import { formatMoney, fromMoney } from "@/shared/money";
import { checkoutSuccessPath } from "@/shared/auth-next";
import type { OrderProblemItem } from "@/shared/api-contract";

type Props = {
  defaultName?: string;
};

const initial: CheckoutFormState = { ok: false };

/**
 * Очищает localStorage-корзину в момент submit, чтобы снизить дубли
 * при двойном клике / второй вкладке. Снимок в pending (inflight):
 * при ошибке — откат из памяти; при успехе — status placed (не ресторить);
 * при закрытии вкладки до ответа — restore из inflight в CartHydrator.
 */
async function checkoutFormAction(
  prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const snapshot = useCartStore.getState().refs;
  saveCheckoutCartSnapshot(snapshot);
  useCartStore.getState().clear();

  const result = await checkoutAction(prev, formData);
  if (!result.ok) {
    useCartStore.getState().replaceRefs(snapshot);
    clearCheckoutCartSnapshot();
    return result;
  }

  // Не clear: если вкладку закроют до /checkout/success, placed не даст вернуть корзину.
  markCheckoutCartPlaced();
  return result;
}

function formatProblem(problem: OrderProblemItem): string {
  if (problem.reason === "not_found") {
    return `Товар не найден (${problem.productId})`;
  }
  const title = problem.title ?? problem.productId;
  return `«${title}»: запрошено ${problem.requested}, доступно ${problem.available}`;
}

/** Состояния до формы: загрузка, ошибка каталога, пустая корзина, «оформляем». */
function checkoutPreflight(
  cart: Pick<UseCartMergedResult, "hydrated" | "refs" | "error" | "pending">,
  placing: boolean,
): ReactNode | null {
  const { hydrated, refs, error, pending: catalogPending } = cart;

  if (!hydrated || (catalogPending && !placing)) {
    return (
      <p className="border border-border bg-surface p-6 text-muted" data-testid="checkout-loading">
        Загружаем корзину…
      </p>
    );
  }

  if (error && !placing) {
    return (
      <p
        className="border border-border bg-surface p-6 text-danger"
        data-testid="checkout-catalog-error"
        role="alert"
      >
        {error}
      </p>
    );
  }

  // Корзину чистим в начале submit — показываем «оформляем», а не мигание «пусто».
  if (refs.length === 0 && placing) {
    return (
      <p className="border border-border bg-surface p-6 text-muted" data-testid="checkout-placing">
        Оформляем заказ…
      </p>
    );
  }

  if (refs.length === 0) {
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

  return null;
}

function OrderErrorBlock({ state }: { state: CheckoutFormState }) {
  const hasError = Boolean(state.message || state.problems?.length || state.fieldErrors);
  if (!hasError) return null;

  return (
    <div className="space-y-2 text-sm text-danger" role="alert" data-testid="order-error">
      {state.message ? <p>{state.message}</p> : null}
      {state.problems && state.problems.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5">
          {state.problems.map((problem) => (
            <li key={`${problem.productId}-${problem.reason}`}>{formatProblem(problem)}</li>
          ))}
        </ul>
      ) : null}
      {!state.message && !state.problems?.length && state.fieldErrors ? (
        <p>Проверьте поля формы</p>
      ) : null}
    </div>
  );
}

export function CheckoutForm({ defaultName = "" }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(checkoutFormAction, initial);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  // Без syncClamped: недоступные позиции доживают до сервера и попадают в атомарный отказ.
  const cart = useCartMerged({ syncClamped: false });

  useEffect(() => {
    if (!state.ok || !state.orderId) return;
    router.replace(checkoutSuccessPath(state.orderId));
  }, [state.ok, state.orderId, router]);

  const placing = pending || Boolean(state.ok && state.orderId);
  const preflight = checkoutPreflight(cart, placing);
  if (preflight) return preflight;

  const { refs, merged } = cart;
  const orderItemsJson = JSON.stringify(
    refs.map((ref) => ({
      productId: ref.productId,
      quantity: ref.quantity,
    })),
  );

  return (
    <form
      action={action}
      className="grid gap-8 lg:grid-cols-[1fr_320px]"
      data-testid="checkout-form"
      noValidate
    >
      <input type="hidden" name="items" value={orderItemsJson} />

      <div className="space-y-6">
        <label className="block text-sm">
          <span className="text-muted">Способ получения</span>
          <select
            name="deliveryType"
            className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
            value={deliveryType}
            onChange={(event) =>
              setDeliveryType(event.target.value === "pickup" ? "pickup" : "delivery")
            }
            data-testid="checkout-method"
          >
            <option value="delivery">Доставка</option>
            <option value="pickup">Самовывоз</option>
          </select>
        </label>

        {deliveryType === "delivery" ? (
          <label className="block text-sm">
            <span className="text-muted">Адрес доставки</span>
            <textarea
              name="address"
              rows={3}
              className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
              placeholder="Улица, дом, квартира"
              data-testid="checkout-address"
            />
            {state.fieldErrors?.address?.[0] ? (
              <span className="mt-1 block text-xs text-danger">{state.fieldErrors.address[0]}</span>
            ) : null}
          </label>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted">Получатель</span>
            <input
              type="text"
              name="recipientName"
              defaultValue={defaultName}
              required
              className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
              data-testid="checkout-name"
            />
            {state.fieldErrors?.recipientName?.[0] ? (
              <span className="mt-1 block text-xs text-danger">
                {state.fieldErrors.recipientName[0]}
              </span>
            ) : null}
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
            {state.fieldErrors?.phone?.[0] ? (
              <span className="mt-1 block text-xs text-danger">{state.fieldErrors.phone[0]}</span>
            ) : null}
          </label>
        </div>

        <OrderErrorBlock state={state} />
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
                {formatMoney(fromMoney(line.product.price) * line.quantity)}
              </span>
            </li>
          ))}
          {merged.broken.map((ref) => (
            <li key={ref.productId} className="flex justify-between gap-3 text-danger">
              <span>
                Недоступен ({ref.productId.slice(-8)}) × {ref.quantity}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-border pt-4 font-mono text-lg text-accent">
          <span>Итого</span>
          <span data-testid="checkout-preview-total">{formatMoney(merged.total)}</span>
        </p>
        <button
          type="submit"
          disabled={pending || state.ok || refs.length === 0}
          className="mt-4 w-full bg-accent px-5 py-2.5 font-medium text-bg hover:bg-accent-dim disabled:opacity-40"
          data-testid="checkout-submit"
        >
          {pending || state.ok ? "Оформляем…" : "Подтвердить заказ"}
        </button>
      </aside>
    </form>
  );
}
