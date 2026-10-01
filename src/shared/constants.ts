export const SESSION_COOKIE = "session";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Максимум различных productId при разборе корзины localStorage / заказа. */
export const MAX_CART_IDS = 100;

/** Максимум единиц в одной позиции корзины localStorage и CreateOrderBody. */
export const MAX_CART_LINE_QTY = 99;
