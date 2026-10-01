"use client";

import { ShoppingCart } from "lucide-react";
import { usePathname } from "next/navigation";
import { CartBadge } from "@/features/cart/cart-badge";
import { HeaderAuth } from "@/components/header-auth";
import { NavLink } from "@/components/nav-link";
import { matchesRoute, routes } from "@/shared/routes";
import { cn } from "@/shared/cn";

const navLinkClass =
  "inline-flex items-center gap-1.5 px-2 py-1 text-sm transition hover:text-text";

/** Клиентская навигация шапки: pending по useLinkStatus и aria-current. */
export function HeaderNav() {
  const pathname = usePathname();
  const onCatalog = matchesRoute(pathname, routes.catalog);
  const onCart = matchesRoute(pathname, routes.cart);

  return (
    <nav className="flex items-center gap-1 sm:gap-4" aria-label="Основная навигация">
      <NavLink
        href={routes.catalog}
        className={navLinkClass}
        data-testid="nav-catalog"
        active={onCatalog}
      >
        Каталог
      </NavLink>
      <NavLink
        href={routes.cart}
        className={cn(navLinkClass, "relative")}
        data-testid="nav-cart"
        active={onCart}
      >
        <ShoppingCart className="size-4" aria-hidden />
        <span className="hidden sm:inline">Корзина</span>
        <CartBadge />
      </NavLink>
      <HeaderAuth />
    </nav>
  );
}
