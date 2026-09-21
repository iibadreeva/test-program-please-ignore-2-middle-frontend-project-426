/** Префикс ключа sessionStorage: корзину уже очищали после этого заказа. */
export const ORDER_CART_CLEARED_PREFIX = "hexparts.cart.cleared.order:";

function keyFor(orderId: string): string {
  return `${ORDER_CART_CLEARED_PREFIX}${orderId}`;
}

export function wasCartClearedForOrder(
  orderId: string,
  storage: Pick<Storage, "getItem"> = sessionStorage,
): boolean {
  return storage.getItem(keyFor(orderId)) === "1";
}

export function markCartClearedForOrder(
  orderId: string,
  storage: Pick<Storage, "setItem"> = sessionStorage,
): void {
  storage.setItem(keyFor(orderId), "1");
}

/**
 * Первый вызов для orderId возвращает true (вызывающий должен очистить корзину).
 * Последующие — false, чтобы повторный ?placed=1 не стёр уже новую корзину.
 */
export function claimCartClearForOrder(
  orderId: string,
  storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage,
): boolean {
  if (wasCartClearedForOrder(orderId, storage)) return false;
  markCartClearedForOrder(orderId, storage);
  return true;
}
