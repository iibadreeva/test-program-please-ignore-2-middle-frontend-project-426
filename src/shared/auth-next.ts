/**
 * Хелперы для ?next= после логина: сохраняем pathname + search,
 * чтобы не терять order на success и deep link в кабинете.
 */

const DEFAULT_LOGIN_NEXT = "/account";

/** Куда разрешено возвращать пользователя после логина (без open redirect). */
const SAFE_NEXT_PREFIXES = [
  "/account",
  "/checkout",
  "/cart",
  "/catalog",
  "/products",
] as const;

/**
 * Нормализует ?next=: только относительный путь нашего приложения.
 * Режет //evil.com, /\…, \ , @, :// и пути вне allowlist.
 */
export function resolveLoginNext(
  raw: string | null | undefined,
  fallback: string = DEFAULT_LOGIN_NEXT,
): string {
  if (raw == null) return fallback;

  const candidate = raw.trim();
  if (!candidate) return fallback;

  // Один ведущий «/»; не protocol-relative и не /\host.
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return fallback;
  }
  if (candidate.includes("\\") || candidate.includes("@") || candidate.includes("://")) {
    return fallback;
  }
  if (/[\u0000-\u001f\u007f]/.test(candidate)) {
    return fallback;
  }

  let pathname: string;
  let search: string;
  try {
    const url = new URL(candidate, "http://local.invalid");
    // Чужой host / userinfo = open redirect или userinfo-trick.
    if (url.username || url.password || url.host !== "local.invalid") {
      return fallback;
    }
    pathname = url.pathname;
    search = url.search;
  } catch {
    return fallback;
  }

  const pathOk = SAFE_NEXT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!pathOk) return fallback;

  return `${pathname}${search}`;
}

/** next из middleware: pathname + search (search уже с «?» или пустой). */
export function loginNextFromRequest(pathname: string, search: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const withSearch =
    !search || search === "?"
      ? path
      : `${path}${search.startsWith("?") ? search : `?${search}`}`;
  return resolveLoginNext(withSearch);
}

export function checkoutSuccessPath(orderId?: string): string {
  if (!orderId) return "/checkout/success";
  return `/checkout/success?order=${encodeURIComponent(orderId)}`;
}

export function accountOrderListPath(orderId: string): string {
  return `/account?order=${encodeURIComponent(orderId)}`;
}

/** Ссылка на логин с относительным next (кодируется как один query-параметр). */
export function loginHref(nextPath: string): string {
  const next = resolveLoginNext(nextPath);
  return `/login?next=${encodeURIComponent(next)}`;
}
