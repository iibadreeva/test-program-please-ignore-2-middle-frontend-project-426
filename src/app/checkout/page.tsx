import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/features/checkout-form";
import { requireUser } from "@/server/auth/session";
import { getCartView } from "@/server/services/cart";
import { listPickupPoints } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login?next=/checkout");

  const [cart, pickupPoints] = await Promise.all([
    getCartView(user.id),
    listPickupPoints(),
  ]);

  if (cart.items.length === 0) {
    return (
      <div data-testid="checkout-page" className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">Оформление заказа</h1>
        <p className="border border-border bg-surface p-6 text-muted" data-testid="checkout-empty">
          Корзина пуста. Добавьте товары, чтобы оформить заказ.
        </p>
        <Link href="/catalog" className="inline-block text-accent hover:underline">
          В каталог
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="checkout-page" className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Оформление заказа</h1>
      <CheckoutForm
        pickupPoints={pickupPoints}
        defaultName={user.name}
        total={cart.total}
        cartLines={cart.items.map((item) => ({
          id: item.id,
          title: item.product.title,
          quantity: item.quantity,
          price: item.product.price,
        }))}
      />
    </div>
  );
}
