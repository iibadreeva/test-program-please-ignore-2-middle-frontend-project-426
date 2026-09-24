import Link from "next/link";
import { CartView } from "@/features/cart/cart-view";

export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <div data-testid="cart-page" className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Корзина</h1>
        <Link href="/catalog" className="text-sm text-muted hover:text-accent">
          Продолжить покупки
        </Link>
      </div>
      <CartView />
    </div>
  );
}
