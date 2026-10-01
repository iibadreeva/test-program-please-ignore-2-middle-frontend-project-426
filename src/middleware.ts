import { NextResponse, type NextRequest } from "next/server";
import { loginNextFromRequest } from "@/shared/auth-next";
import { SESSION_COOKIE } from "@/shared/constants";
import { matchesRoute, routes } from "@/shared/routes";

const PROTECTED_PREFIXES = [routes.account, routes.checkout];

/**
 * Middleware — только быстрый UX-фильтр по наличию session cookie.
 * Не проверяет сессию в БД и не является настоящей авторизацией:
 * реальная проверка всегда на сервере через requireUser / getCurrentUser
 * (страницы, server actions, protected API).
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((path) => matchesRoute(pathname, path));
  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = routes.login;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", loginNextFromRequest(pathname, search));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Matcher Next требует литералы; значения совпадают с routes.account / routes.checkout.
  matcher: ["/account", "/account/:path*", "/checkout", "/checkout/:path*"],
};
