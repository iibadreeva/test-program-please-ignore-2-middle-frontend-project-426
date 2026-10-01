"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { routes } from "@/shared/routes";
import { cn } from "@/shared/cn";

function LinkPendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      className="bg-accent ml-1 inline-block size-1.5 animate-pulse rounded-full"
      aria-hidden
      data-testid="nav-link-pending"
    />
  );
}

type NavLinkProps = ComponentProps<typeof Link> & {
  children: ReactNode;
  active?: boolean;
  /**
   * nav — явный muted/text (пункты шапки);
   * bare — цвет только из className (CTA с text-bg и т.п.).
   */
  tone?: "nav" | "bare";
};

/** Лёгкий Link с pending-индикатором — без зависимостей шапки (корзина/auth). */
export function NavLink({
  children,
  className,
  active = false,
  tone = "nav",
  ...props
}: NavLinkProps) {
  return (
    <Link
      {...props}
      className={cn(
        className,
        tone === "nav" && (active ? "text-text" : "text-muted"),
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
      <LinkPendingDot />
    </Link>
  );
}

type LogoLinkProps = {
  className?: string;
};

export function LogoLink({ className }: LogoLinkProps) {
  const pathname = usePathname();
  const onHome = pathname === routes.home;

  return (
    <NavLink
      href={routes.home}
      className={cn(className, "text-text transition hover:text-text")}
      data-testid="logo"
      active={onHome}
      tone="bare"
    >
      HexParts
    </NavLink>
  );
}

type CatalogCtaLinkProps = {
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
};

/** CTA «В каталог» с pending-индикатором (для hero) — отдельный модуль от HeaderNav. */
export function CatalogCtaLink({ className, children, ...rest }: CatalogCtaLinkProps) {
  return (
    <NavLink href={routes.catalog} className={className} tone="bare" {...rest}>
      {children}
    </NavLink>
  );
}
