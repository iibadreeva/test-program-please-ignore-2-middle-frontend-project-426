import { normalizeRefs, type CartRef } from "@/features/cart/cart-items";
import { matchesRoute, routes } from "@/shared/routes";

/** Снимок корзины на время оформления: переживает закрытие вкладки (в отличие от памяти). */
export const CHECKOUT_CART_PENDING_KEY = "hexparts.cart.checkout-pending.v1";

/**
 * inflight — ждём ответ;
 * placed — заказ создан, корзину не восстанавливать;
 * unconfirmed — ответ потерян, заказ мог создаться: сами не возвращаем.
 */
export type CheckoutPendingStatus = "inflight" | "placed" | "unconfirmed";

export type CheckoutPending = {
  refs: CartRef[];
  status: CheckoutPendingStatus;
};

function canUseStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function pendingStatus(value: unknown): CheckoutPendingStatus {
  if (value === "placed" || value === "unconfirmed") return value;
  return "inflight";
}

function writePending(pending: CheckoutPending): void {
  if (!canUseStorage()) return;
  localStorage.setItem(CHECKOUT_CART_PENDING_KEY, JSON.stringify(pending));
}

/** Прочитать pending целиком (refs + status). Старый формат без status = inflight. */
export function readCheckoutPending(): CheckoutPending | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(CHECKOUT_CART_PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("refs" in parsed)) {
      return null;
    }
    const refs = normalizeRefs((parsed as { refs: unknown }).refs);
    if (refs.length === 0) return null;
    const status = pendingStatus((parsed as { status?: unknown }).status);
    return { refs, status };
  } catch {
    return null;
  }
}

/** Сохранить refs перед очисткой корзины на submit. */
export function saveCheckoutCartSnapshot(refs: CartRef[]): void {
  const normalized = normalizeRefs(refs);
  if (normalized.length === 0) return;
  writePending({ refs: normalized, status: "inflight" });
}

/**
 * Заказ создан на сервере: не восстанавливать корзину при закрытии вкладки
 * до перехода на success (иначе возможен повторный заказ).
 */
export function markCheckoutCartPlaced(): void {
  const pending = readCheckoutPending();
  if (!pending) return;
  writePending({ refs: pending.refs, status: "placed" });
}

/**
 * Ответ server action не дошёл. Заказ уже мог быть создан,
 * поэтому снимок остаётся, но сам в корзину не возвращается.
 */
export function markCheckoutCartUnconfirmed(): void {
  const pending = readCheckoutPending();
  if (!pending) return;
  writePending({ refs: pending.refs, status: "unconfirmed" });
}

/** Прочитать refs без удаления (только inflight; placed и unconfirmed дают null). */
export function readCheckoutCartSnapshot(): CartRef[] | null {
  const pending = readCheckoutPending();
  if (!pending || pending.status !== "inflight") return null;
  return pending.refs;
}

/** Прочитать и удалить pending для restore (только inflight). */
export function takeCheckoutCartSnapshot(): CartRef[] | null {
  const pending = readCheckoutPending();
  if (pending?.status === "unconfirmed") return null;
  clearCheckoutCartSnapshot();
  if (!pending || pending.status === "placed") return null;
  return pending.refs;
}

export function clearCheckoutCartSnapshot(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(CHECKOUT_CART_PENDING_KEY);
}

/**
 * После rehydrate: на success / placed — сбрасываем pending без restore;
 * unconfirmed не трогаем и не возвращаем (заказ мог уже создаться);
 * если корзина пуста и pending inflight — возвращаем снимок (вкладку закрыли до ответа);
 * иначе pending устарел и удаляется.
 */
export function resolvePendingCheckoutRestore(
  pathname: string,
  currentRefs: CartRef[],
): CartRef[] | null {
  if (matchesRoute(pathname, routes.checkoutSuccess)) {
    clearCheckoutCartSnapshot();
    return null;
  }

  const pending = readCheckoutPending();
  if (!pending) return null;

  if (pending.status === "placed") {
    clearCheckoutCartSnapshot();
    return null;
  }

  // Исход неизвестен: не подмешивать корзину при загрузке страницы.
  if (pending.status === "unconfirmed") return null;

  if (currentRefs.length > 0) {
    clearCheckoutCartSnapshot();
    return null;
  }

  clearCheckoutCartSnapshot();
  return pending.refs;
}
