import Link from "next/link";
import { CartView } from "@/features/cart/cart-view";
import { routes } from "@/shared/routes";

export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <div data-testid="cart-page" className="space-y-6">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h1 className="font-display min-w-0 text-3xl font-semibold">Корзина</h1>
        <Link href={routes.catalog} className="text-sm text-muted hover:text-accent">
          Продолжить покупки
        </Link>
      </div>
      <CartView />
    </div>
  );
}
