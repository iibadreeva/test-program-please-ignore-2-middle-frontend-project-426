import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/shared/constants";

const PROTECTED_PREFIXES = ["/account", "/checkout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account", "/account/:path*", "/checkout", "/checkout/:path*"],
};
