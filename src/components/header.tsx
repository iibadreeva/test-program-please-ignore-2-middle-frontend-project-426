import Link from "next/link";
import { ShoppingCart, User } from "lucide-react";
import { CartBadge } from "@/components/cart-badge";
import { logoutAction } from "@/features/auth-actions";
import { getCurrentUser } from "@/server/auth/session";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight"
          data-testid="logo"
        >
          HexParts
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4" aria-label="Основная навигация">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-muted transition hover:text-text"
            data-testid="nav-catalog"
          >
            Каталог
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex items-center gap-1.5 px-2 py-1 text-sm text-muted transition hover:text-text"
            data-testid="nav-cart"
          >
            <ShoppingCart className="size-4" aria-hidden />
            <span className="hidden sm:inline">Корзина</span>
            <CartBadge />
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-muted transition hover:text-text"
            data-testid="nav-account"
          >
            <User className="size-4" aria-hidden />
            <span className="hidden sm:inline">{user ? user.name.split(" ")[0] : "Кабинет"}</span>
          </Link>
          {user ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="ml-1 border border-border px-3 py-1.5 text-sm transition hover:border-accent"
                data-testid="nav-logout"
              >
                Выйти
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="ml-1 border border-border px-3 py-1.5 text-sm transition hover:border-accent"
              data-testid="nav-login"
            >
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
