import Link from "next/link";
import { formatPrice } from "@/shared/format";
import { requireUser } from "@/server/auth/session";
import { listOrders, orderStatusLabel } from "@/server/services/orders";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login?next=/account/orders");

  const orders = await listOrders(user.id);

  return (
    <div data-testid="account-orders-page" className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Мои заказы</h1>
        <Link href="/account" className="text-sm text-muted hover:text-accent">
          В кабинет
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="border border-border bg-surface p-6 text-muted" data-testid="orders-empty">
          Заказов пока нет.{" "}
          <Link href="/catalog" className="text-accent hover:underline">
            Перейти в каталог
          </Link>
        </p>
      ) : (
        <ul className="space-y-3" data-testid="orders-list">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface px-4 py-3 hover:border-accent"
                data-testid="order-list-item"
              >
                <div>
                  <p className="font-mono text-sm text-muted">#{order.id.slice(-8)}</p>
                  <p className="mt-1 text-sm">
                    {new Date(order.createdAt).toLocaleString("ru-RU")} ·{" "}
                    {orderStatusLabel(order.status)}
                  </p>
                </div>
                <p className="font-mono text-accent" data-testid="order-list-total">
                  {formatPrice(order.totalCents)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
