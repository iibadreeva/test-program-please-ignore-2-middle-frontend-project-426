/**
 * UI-пути приложения: единственный источник для Link, redirect и хелперов.
 * API (`/api/*`) сюда не входит.
 */

const paths = {
  home: "/",
  catalog: "/catalog",
  cart: "/cart",
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",
  account: "/account",
  login: "/login",
  register: "/register",
  /** Префикс страниц товара (allowlist ?next=, startsWith). */
  products: "/products",
} as const;

export const routes = {
  ...paths,

  product: (slug: string) => `${paths.products}/${encodeURIComponent(slug)}`,

  catalogCategory: (category: string) =>
    `${paths.catalog}?category=${encodeURIComponent(category)}`,

  loginWithNext: (next: string) =>
    `${paths.login}?next=${encodeURIComponent(next)}`,

  checkoutSuccessWithOrder: (orderId: string) =>
    `${paths.checkoutSuccess}?order=${encodeURIComponent(orderId)}`,

  accountWithOrder: (orderId: string) =>
    `${paths.account}?order=${encodeURIComponent(orderId)}`,
} as const;

/** Куда разрешено возвращать пользователя после логина (без open redirect). */
export const SAFE_NEXT_PREFIXES = [
  routes.account,
  routes.checkout,
  routes.cart,
  routes.catalog,
  routes.products,
] as const;

export const DEFAULT_LOGIN_NEXT = routes.account;

/** pathname === base или вложенный путь (`/base/...`), без ложных `/basefoo`. */
export function matchesRoute(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}
